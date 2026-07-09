// Copa del Sol — browser chain logic. Pure transaction building for the paid
// journey: derive PDAs, assemble the program's own instructions, and hand back
// a ready-to-sign Transaction. Deliberately Solana-only (the wasm game has no
// Solana dep by design); the wallet layer signs whatever this produces.
//
// Dual module: `window.CopaChain` in the browser, `module.exports` in node
// (so the exact tx logic that ships can be self-tested headlessly against
// devnet before any wallet UI is wired).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('@solana/web3.js'));
  else root.CopaChain = factory(root.solanaWeb3);
})(typeof self !== 'undefined' ? self : this, function (web3) {
  const { PublicKey, Transaction, TransactionInstruction, SystemProgram } = web3;

  // Anchor discriminators = sha256("global:<ix>")[..8], precomputed so the
  // browser needs no hashing at runtime.
  const DISC = {
    register: [211, 124, 67, 15, 211, 194, 178, 240],
    claim: [62, 198, 214, 193, 213, 159, 108, 210],
  };

  const enc = (s) => new TextEncoder().encode(s);
  const u64le = (n) => {
    const b = new Uint8Array(8);
    let v = BigInt(n);
    for (let i = 0; i < 8; i++) { b[i] = Number(v & 0xffn); v >>= 8n; }
    return b;
  };

  function pdas(programId, cupId, player) {
    const pid = new PublicKey(programId);
    const [config] = PublicKey.findProgramAddressSync([enc('config')], pid);
    const [cup] = PublicKey.findProgramAddressSync([enc('cup'), u64le(cupId)], pid);
    const [entry] = PublicKey.findProgramAddressSync(
      [enc('entry'), cup.toBytes(), new PublicKey(player).toBytes()], pid);
    return { pid, config, cup, entry };
  }

  // The `register` instruction — enter a cup. copa_ticket is optional; when the
  // config's hold-gate is disarmed (or a free lane), pass null and anchor's
  // None sentinel (the program id itself) stands in.
  function registerInstruction(programId, cupId, player, copaTicket) {
    const { pid, config, cup, entry } = pdas(programId, cupId, player);
    const ticket = copaTicket ? new PublicKey(copaTicket) : pid; // None → program id
    const keys = [
      { pubkey: config, isSigner: false, isWritable: false },
      { pubkey: cup, isSigner: false, isWritable: true },
      { pubkey: entry, isSigner: false, isWritable: true },
      { pubkey: new PublicKey(player), isSigner: true, isWritable: true },
      { pubkey: ticket, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ];
    return new TransactionInstruction({ programId: pid, keys, data: Buffer.from(DISC.register) });
  }

  // Build an unsigned, fee-payer-set, recent-blockhash Transaction for entering
  // `cupId` as `player`. The caller (wallet) signs + sends.
  async function buildEnterCup(connection, programId, cupId, player, copaTicket) {
    const tx = new Transaction().add(registerInstruction(programId, cupId, player, copaTicket));
    tx.feePayer = new PublicKey(player);
    tx.recentBlockhash = (await connection.getLatestBlockhash('confirmed')).blockhash;
    return tx;
  }

  return { DISC, pdas, registerInstruction, buildEnterCup };
});
