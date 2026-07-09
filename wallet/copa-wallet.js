// Copa del Sol — browser wallet layer. Detect + connect an injected Solana
// wallet (Phantom / Solflare), read balance, and enter a cup by handing the
// wallet a `register` transaction built by copa-chain.js. The wallet signs and
// sends; nothing here holds a key. Sits over the game as a thin DOM layer — the
// wasm renderer stays Solana-free.
(function (root) {
  const web3 = root.solanaWeb3;
  const Chain = root.CopaChain;

  let provider = null;   // the injected wallet
  let pubkey = null;     // connected PublicKey
  let conn = null;       // web3 Connection
  let programId = null;

  function detect() {
    // Phantom exposes window.phantom.solana (or legacy window.solana);
    // Solflare exposes window.solflare. Prefer an explicitly Solana provider.
    if (root.phantom?.solana?.isPhantom) return root.phantom.solana;
    if (root.solflare?.isSolflare) return root.solflare;
    if (root.solana?.isPhantom) return root.solana;
    return null;
  }

  function walletName() {
    if (!provider) return '';
    if (provider.isPhantom) return 'Phantom';
    if (provider.isSolflare) return 'Solflare';
    return 'Wallet';
  }

  function init(rpcUrl, programIdStr) {
    conn = new web3.Connection(rpcUrl, 'confirmed');
    programId = programIdStr;
  }

  async function connect() {
    provider = detect();
    if (!provider) {
      const e = new Error('No Solana wallet found. Install Phantom or Solflare.');
      e.code = 'NO_WALLET';
      throw e;
    }
    const resp = await provider.connect();
    pubkey = resp.publicKey || provider.publicKey;
    return pubkey.toBase58();
  }

  async function disconnect() {
    try { await provider?.disconnect(); } catch { /* wallet already gone */ }
    provider = null; pubkey = null;
  }

  async function solBalance() {
    if (!pubkey) return 0;
    return (await conn.getBalance(pubkey)) / web3.LAMPORTS_PER_SOL;
  }

  // Enter `cupId`: build the register tx, hand it to the wallet to sign+send.
  // `copaTicket` is null unless the config's $COPA hold-gate is armed.
  async function enterCup(cupId, copaTicket) {
    if (!pubkey) throw new Error('Connect a wallet first.');
    const tx = await Chain.buildEnterCup(conn, programId, cupId, pubkey.toBase58(), copaTicket || null);
    // Phantom/Solflare both expose signAndSendTransaction; fall back to
    // sign-then-send for wallets that only sign.
    if (provider.signAndSendTransaction) {
      const { signature } = await provider.signAndSendTransaction(tx);
      await conn.confirmTransaction(signature, 'confirmed');
      return signature;
    }
    const signed = await provider.signTransaction(tx);
    const signature = await conn.sendRawTransaction(signed.serialize());
    await conn.confirmTransaction(signature, 'confirmed');
    return signature;
  }

  root.CopaWallet = {
    init, detect, connect, disconnect, solBalance, enterCup,
    get pubkey() { return pubkey ? pubkey.toBase58() : null; },
    get connected() { return !!pubkey; },
    walletName,
  };
})(window);
