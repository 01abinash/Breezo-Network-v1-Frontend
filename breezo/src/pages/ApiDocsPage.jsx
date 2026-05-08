import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { PublicKey, Transaction } from '@solana/web3.js'
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAccount,
} from '@solana/spl-token'
import BN from 'bn.js'
import { getTreasuryPDA, toBaseUnits } from '../solana/program/breezo.method'
import { purchaseCredits } from '../api/apiKey.api'
import { useProgram } from '../hooks/useProgram'
import styles from './ApiDocsPage.module.css'

// ─── CONFIG ────────────────────────────────────────────────────────────────────
const API_BASE    = 'https://api.breezonetwork.xyz/api/v1'
const BREEZO_MINT = new PublicKey('soQUnxjoEMCMxBroyS4AvrtVn2JCtPZnR3N53NA5AvU')

// ─── STATIC DATA ───────────────────────────────────────────────────────────────
const SIDEBAR_LINKS = [
  { id: 'overview',  label: 'Overview'  },
  { id: 'auth',      label: 'Auth'      },
  { id: 'endpoints', label: 'Endpoints' },
  { id: 'pricing',   label: 'Pricing'   },
  { id: 'examples',  label: 'Examples'  },
]

const ENDPOINTS = [
  {
    id: 'current',
    title: 'Get Current Conditions',
    method: 'GET',
    path: '/weather/current',
    desc: 'Returns the latest air quality and weather reading from a specific node.',
    params: [
      { name: 'nodeId', required: true,  desc: 'Unique identifier of the target node' },
    ],
    request: `GET ${API_BASE}/weather/current?nodeId=node_abc123\nx-api-key: YOUR_API_KEY`,
    response: `{
  "success": true,
  "data": {
    "nodeId": "node_abc123",
    "temperature": 28.5,
    "humidity": 64,
    "pm25": 12.4,
    "pm10": 18.7,
    "aqi": 90,
    "aqiLevel": "MODERATE",
    "timestamp": "2026-04-28T09:12:00Z"
  }
}`,
  },
  {
    id: 'nearby',
    title: 'Get Nearby Nodes',
    method: 'GET',
    path: '/weather/nearby',
    desc: 'Returns readings from all active nodes within a given radius of a coordinate.',
    params: [
      { name: 'lat',    required: true,  desc: 'Latitude of the center point' },
      { name: 'lng',    required: true,  desc: 'Longitude of the center point' },
      { name: 'radius', required: false, desc: 'Search radius in km (default: 5)' },
    ],
    request: `GET ${API_BASE}/weather/nearby?lat=27.7172&lng=85.3240&radius=5\nx-api-key: YOUR_API_KEY`,
    response: `{
  "success": true,
  "count": 2,
  "data": [
    {
      "nodeId": "node_abc123",
      "distance": 1.2,
      "temperature": 28.1,
      "pm25": 11.0,
      "aqi": 84,
      "aqiLevel": "GOOD"
    }
  ]
}`,
  },
  {
    id: 'history',
    title: 'Get Historical Data',
    method: 'GET',
    path: '/weather/history',
    desc: 'Returns historical environmental readings for a node, aggregated by day.',
    params: [
      { name: 'nodeId', required: true,  desc: 'Target node identifier' },
      { name: 'days',   required: false, desc: 'Days to look back (default: 7, max: 30)' },
      { name: 'from',   required: false, desc: 'ISO date string — start of range' },
      { name: 'to',     required: false, desc: 'ISO date string — end of range' },
    ],
    request: `GET ${API_BASE}/weather/history?nodeId=node_abc123&days=7\nx-api-key: YOUR_API_KEY`,
    response: `{
  "success": true,
  "nodeId": "node_abc123",
  "data": [
    {
      "date": "2026-04-21",
      "avgTemperature": 27.2,
      "avgPm25": 10.8,
      "avgAqi": 101,
      "readings": 144
    }
  ]
}`,
  },
  {
    id: 'nodes',
    title: 'List All Nodes',
    method: 'GET',
    path: '/nodes',
    desc: 'Returns a list of all active Breezo nodes and their last known status.',
    params: [
      { name: 'status', required: false, desc: 'Filter: active | inactive | all' },
      { name: 'limit',  required: false, desc: 'Max results to return (default: 50)' },
    ],
    request: `GET ${API_BASE}/nodes?status=active&limit=20\nx-api-key: YOUR_API_KEY`,
    response: `{
  "success": true,
  "count": 1,
  "data": [
    {
      "nodeId": "node_abc123",
      "lat": 27.7172,
      "lng": 85.3240,
      "status": "active",
      "lastSeen": "2026-04-28T09:12:00Z"
    }
  ]
}`,
  },
]

// creditAmount = the string the backend expects in { amount }
const PLANS = [
  {
    id: 'basic',
    name: 'Basic Plan',
    tokens: 50,
    requests: '10,000',
    creditAmount: '10000',
    detail: 'Current conditions, 7-day history, standard rate limit.',
    highlight: false,
    cta: 'Buy Basic Plan',
  },
  {
    id: 'intermediate',
    name: 'Intermediate Plan',
    tokens: 250,
    requests: '100,000',
    creditAmount: '100000',
    detail: 'Full history access, nearby nodes API, priority rate limit.',
    highlight: true,
    cta: 'Upgrade to Pro',
  },
  {
    id: 'enterprise',
    name: 'Enterprise Plan',
    tokens: 1000,
    requests: 'Unlimited',
    creditAmount: null,
    detail: 'SLA support, dedicated infrastructure, custom limits.',
    highlight: false,
    cta: 'Contact Sales',
  },
]

const EXAMPLES = [
  {
    id: 'js',
    title: 'JavaScript',
    code: `fetch("${API_BASE}/weather/current?nodeId=node_abc123", {
  headers: { "x-api-key": "YOUR_API_KEY" }
})
  .then(r => r.json())
  .then(({ data }) => console.log(\`AQI: \${data.aqi} — \${data.aqiLevel}\`))`,
  },
  {
    id: 'py',
    title: 'Python',
    code: `import requests

r = requests.get(
    "${API_BASE}/weather/current",
    params={"nodeId": "node_abc123"},
    headers={"x-api-key": "YOUR_API_KEY"}
)
data = r.json()["data"]
print(f"AQI: {data['aqi']} — {data['aqiLevel']}")`,
  },
]

const STATUS_CODES = [
  { code: '200', label: 'OK',           desc: 'Request succeeded.' },
  { code: '400', label: 'Bad Request',  desc: 'Missing or invalid parameters.' },
  { code: '401', label: 'Unauthorized', desc: 'API key missing, invalid, or expired.' },
  { code: '403', label: 'Forbidden',    desc: 'Plan limit exceeded for this billing period.' },
  { code: '404', label: 'Not Found',    desc: 'Node ID does not exist.' },
  { code: '429', label: 'Rate Limited', desc: 'Too many requests — implement backoff.' },
  { code: '500', label: 'Server Error', desc: 'Something went wrong on our end.' },
]

// ─── COPY HOOK ─────────────────────────────────────────────────────────────────
function useCopy() {
  const [copiedKey, setCopiedKey] = useState('')
  const copy = async (id, text) => {
    await navigator.clipboard.writeText(text)
    setCopiedKey(id)
    setTimeout(() => setCopiedKey(c => (c === id ? '' : c)), 1800)
  }
  return { copiedKey, copy }
}

// ─── SMALL COMPONENTS ──────────────────────────────────────────────────────────
function CopyButton({ id, text, copy, copiedKey }) {
  return (
    <button className={styles.copyBtn} onClick={() => copy(id, text)}>
      {copiedKey === id ? '✓ Copied' : 'Copy'}
    </button>
  )
}

function CodeBlock({ id, title, code, copy, copiedKey }) {
  return (
    <div className={styles.codeCard}>
      <div className={styles.codeHeader}>
        <span>{title}</span>
        <CopyButton id={id} text={code} copy={copy} copiedKey={copiedKey} />
      </div>
      <pre className={styles.codeBlock}>
        <code>{code}</code>
      </pre>
    </div>
  )
}

// ─── BUY CREDITS MODAL ─────────────────────────────────────────────────────────
// The modal itself uses a full-screen overlay (position:fixed) which cannot come
// from a scoped CSS module, so only the overlay wrapper uses minimal inline style.
// Everything inside reuses existing module classes.
function BuyCreditsModal({ plan, onClose, authToken }) {
  const { connection }           = useConnection()
  const wallet                   = useWallet()
  const { publicKey, connected } = wallet
  const program                  = useProgram()

  const [step,       setStep]       = useState('confirm') // confirm|approving|purchasing|done|error
  const [txSig,      setTxSig]      = useState('')
  const [errMsg,     setErrMsg]     = useState('')
  const [newCredits, setNewCredits] = useState(null)

  const handleBuy = async () => {
    if (!program || !publicKey) return
    try {
      setStep('approving')

      const treasuryAuthority    = getTreasuryPDA()
      const treasuryTokenAccount = await getAssociatedTokenAddress(
        BREEZO_MINT, treasuryAuthority, true
      )
      const userTokenAccount = await getAssociatedTokenAddress(BREEZO_MINT, publicKey)

      // Auto-create user ATA if missing
      try {
        await getAccount(connection, userTokenAccount)
      } catch {
        console.log('[buy] User ATA missing — creating…')
        const createIx = createAssociatedTokenAccountInstruction(
          publicKey, userTokenAccount, publicKey, BREEZO_MINT,
          TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID
        )
        const { blockhash } = await connection.getLatestBlockhash()
        const tx = new Transaction()
        tx.recentBlockhash = blockhash
        tx.feePayer = publicKey
        tx.add(createIx)
        const signed  = await wallet.signTransaction(tx)
        const atasSig = await connection.sendRawTransaction(signed.serialize())
        await connection.confirmTransaction(atasSig, 'confirmed')
        console.log('[buy] User ATA created')
      }

      // toBaseUnits(human) → BigInt → BN for Anchor
      const rawBigInt = toBaseUnits(plan.tokens)
      const amount    = new BN(rawBigInt.toString())

      console.log('[buy] human BREEZO:', plan.tokens)
      console.log('[buy] raw units:', rawBigInt.toString())

      setStep('purchasing')

      // ── Step 1: on-chain buy_product ──────────────────────────────────────
      const sig = await program.methods
        .buyProduct(amount)
        .accounts({
          user:                 publicKey,
          mint:                 BREEZO_MINT,
          userTokenAccount:     userTokenAccount,
          treasuryTokenAccount: treasuryTokenAccount,
          tokenProgram:         TOKEN_PROGRAM_ID,
        })
        .rpc()

      console.log('[buy] on-chain TX confirmed:', sig)
      setTxSig(sig)

      // ── Step 2: notify backend after on-chain success ─────────────────────
      // payload = { amount: "10000" } — credit count the backend expects
      const result = await purchaseCredits(authToken, {
        amount: plan.creditAmount,
      })

      console.log('[buy] backend credits now:', result?.credits)
      setNewCredits(result?.credits ?? null)

      setStep('done')
    } catch (err) {
      console.error('[buy] failed:', err)
      setErrMsg(err?.message || 'Transaction failed')
      setStep('error')
    }
  }

  return (
    // Only this overlay wrapper needs position:fixed — unavoidable for a modal
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(14px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
    >
      {/* Modal card — reuses .section card styles */}
      <div className={styles.section} style={{ width: '100%', maxWidth: 460, position: 'relative' }}>

        {/* Close button — reuses .copyBtn */}
        <button className={styles.copyBtn} onClick={onClose}
          style={{ position: 'absolute', top: 16, right: 16 }}>
          ✕
        </button>

        {/* ── CONFIRM ── */}
        {step === 'confirm' && (
          <>
            <div className={styles.sectionKicker}>Purchase Plan</div>

            <h2 className={styles.sectionTitle} style={{ marginTop: 10 }}>{plan.name}</h2>
            <p className={styles.sectionDesc} style={{ marginTop: 4, marginBottom: 20 }}>
              {plan.requests} API requests / month
            </p>

            {/* Summary — reuses .metaCard */}
            <div className={styles.metaCard} style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>You pay</span>
                <strong>◈ {plan.tokens} BREEZO</strong>
              </div>
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <div className={styles.pricingDetail}>
                  You receive: <strong>{plan.requests} API requests</strong>
                </div>
                <div className={styles.pricingDetail}>{plan.detail}</div>
              </div>
            </div>

            {/* On-chain note — reuses .noteItem */}
            <div className={styles.noteItem} style={{ marginBottom: 16, fontSize: 12 }}>
              ⛓ Payment settles on-chain. Quota activates after confirmation.
            </div>

            {!connected ? (
              <div style={{ textAlign: 'center' }}>
                <p className={styles.pricingDetail} style={{ marginBottom: 16 }}>
                  Connect your wallet to purchase
                </p>
                <div className={styles.walletBtnWrap}>
                  <WalletMultiButton />
                </div>
              </div>
            ) : (
              <>
                {/* Wallet address — reuses .endpointPath */}
                <div className={styles.endpointPath} style={{ marginBottom: 16 }}>
                  Wallet: {publicKey?.toBase58().slice(0, 8)}…{publicKey?.toBase58().slice(-6)}
                </div>
                <button
                  className={styles.primaryAction}
                  onClick={handleBuy}
                  style={{ width: '100%' }}
                >
                  Pay ◈ {plan.tokens} BREEZO
                </button>
              </>
            )}
          </>
        )}

        {/* ── IN PROGRESS ── */}
        {(step === 'approving' || step === 'purchasing') && (
          <div style={{ textAlign: 'center', padding: '28px 0' }}>
            <style>{`@keyframes bspin{to{transform:rotate(360deg)}}`}</style>
            <div style={{
              width: 48, height: 48, borderRadius: '50%',
              margin: '0 auto 20px',
              border: '3px solid rgba(56,189,248,0.15)',
              borderTopColor: '#38bdf8',
              animation: 'bspin 0.85s linear infinite',
            }} />
            <h3 className={styles.sectionTitle} style={{ fontSize: 18, marginTop: 0 }}>
              {step === 'approving' ? 'Waiting for wallet approval' : 'Processing on-chain'}
            </h3>
            <p className={styles.pricingDetail}>
              {step === 'approving'
                ? 'Approve the transaction in your wallet…'
                : 'Sending to Solana — do not close this window…'}
            </p>
          </div>
        )}

        {/* ── DONE ── */}
        {step === 'done' && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div className={styles.tokenIcon} style={{ margin: '0 auto 20px', width: 52, height: 52, fontSize: 22 }}>
              ✓
            </div>
            <h3 className={styles.sectionTitle} style={{ fontSize: 20, marginTop: 0, color: '#2dd4bf' }}>
              Purchase Complete!
            </h3>
            <p className={styles.pricingDetail} style={{ marginTop: 8 }}>
              {plan.name} is now active. {plan.requests} requests credited.
            </p>
            {newCredits !== null && (
              <p className={styles.pricingRequests} style={{ fontSize: 16, marginTop: 8 }}>
                Total balance: {newCredits} credits
              </p>
            )}
            {txSig && (
              <a
                href={`https://solscan.io/tx/${txSig}?cluster=devnet`}
                target="_blank" rel="noreferrer"
                className={styles.secondaryAction}
                style={{ display: 'inline-flex', marginTop: 16, marginBottom: 16, fontSize: 12 }}
              >
                View on Solscan ↗
              </a>
            )}
            <br />
            <button className={styles.planBtn} onClick={onClose} style={{ marginTop: 8 }}>
              Done
            </button>
          </div>
        )}

        {/* ── ERROR ── */}
        {step === 'error' && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div className={styles.tokenIcon} style={{ margin: '0 auto 20px', width: 52, height: 52, fontSize: 22 }}>
              ✕
            </div>
            <h3 className={styles.sectionTitle} style={{ fontSize: 18, marginTop: 0 }}>
              Transaction Failed
            </h3>
            <p className={styles.pricingDetail} style={{
              marginTop: 8, marginBottom: 24,
              wordBreak: 'break-word', maxHeight: 80, overflowY: 'auto',
            }}>
              {errMsg}
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className={styles.secondaryAction} onClick={() => setStep('confirm')}
                style={{ flex: 1 }}>
                Try Again
              </button>
              <button className={styles.planBtn} onClick={onClose} style={{ flex: 1 }}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── MAIN PAGE ──────────────────────────────────────────────────────────────────
export default function ApiDocsPage() {
  const [expanded, setExpanded] = useState(ENDPOINTS[0].id)
  const [buyPlan,  setBuyPlan]  = useState(null)
  const { copiedKey, copy }     = useCopy()

  // Pull JWT from wherever your app stores it
  const authToken =
    typeof window !== 'undefined' ? localStorage.getItem('auth_token') || '' : ''

  return (
    <div className={styles.page}>

      {/* BUY MODAL */}
      {buyPlan && (
        <BuyCreditsModal
          plan={buyPlan}
          authToken={authToken}
          onClose={() => setBuyPlan(null)}
        />
      )}

      <div className={styles.layout}>

        {/* ── SIDEBAR ── */}
        <aside className={styles.sidebar}>
          <div className={styles.sidebarInner}>
            <div className={styles.sidebarLabel}>Breezo API Docs</div>
            <nav className={styles.sidebarNav}>
              {SIDEBAR_LINKS.map(item => (
                <a key={item.id} href={`#${item.id}`} className={styles.sidebarLink}>
                  {item.label}
                </a>
              ))}
            </nav>
          </div>
        </aside>

        {/* ── CONTENT ── */}
        <main className={styles.content}>

          {/* ── OVERVIEW ── */}
          <section id="overview" className={styles.section}>
            <div className={styles.hero}>
              <div className={styles.heroLabel}>Developer Platform</div>
              <h1 className={styles.heroTitle}>Breezo API<br />Documentation</h1>
              <p className={styles.heroDesc}>
                Access live environmental intelligence from the Breezo DePIN sensor
                network. Query real-time AQI, nearby nodes, and historical data —
                authenticated with your BREEZO token-powered API key.
              </p>
              <div className={styles.heroMeta}>
                <div className={styles.metaCard}>
                  <span>What it provides</span>
                  <strong>Live AQI, temperature, PM2.5, PM10, and historical data</strong>
                </div>
                <div className={styles.metaCard}>
                  <span>Who it's for</span>
                  <strong>Apps, dashboards, research pipelines, and institutional reporting</strong>
                </div>
              </div>
              <div className={styles.heroActions}>
                <a href="#pricing" className={styles.primaryAction}>Get API Access</a>
                <a href="#endpoints" className={styles.secondaryAction}>Browse Endpoints →</a>
              </div>
            </div>
          </section>

          {/* ── AUTH ── */}
          <section id="auth" className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionKicker}>Authentication</div>
              <h2 className={styles.sectionTitle}>Secure every request</h2>
              <p className={styles.sectionDesc}>
                Every request requires an API key in the <code>x-api-key</code> header.
                Missing or invalid keys return <code>401 Unauthorized</code>.
              </p>
            </div>

            <div className={styles.authGrid}>
              <div className={styles.authCard}>
                <div className={styles.authLabel}>Required Header</div>
                <div className={styles.authHeaderRow}>
                  <code className={styles.authHeaderValue}>x-api-key: YOUR_API_KEY</code>
                  <CopyButton
                    id="auth-header"
                    text="x-api-key: YOUR_API_KEY"
                    copy={copy}
                    copiedKey={copiedKey}
                  />
                </div>
              </div>
              <div className={styles.authNotes}>
                <div className={styles.noteItem}>🔑 Every request requires an API key</div>
                <div className={styles.noteItem}>📨 Pass via the <code>x-api-key</code> header</div>
                <div className={styles.noteItem}>🔒 Never expose your key in client-side code</div>
                <div className={styles.noteItem}>🔄 Regenerate keys anytime from your dashboard</div>
              </div>
            </div>
          </section>

          {/* ── ENDPOINTS ── */}
          <section id="endpoints" className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionKicker}>API Reference</div>
              <h2 className={styles.sectionTitle}>Live endpoint reference</h2>
              <p className={styles.sectionDesc}>
                Expand each endpoint for query parameters, example request, and response.
              </p>
            </div>

            <div className={styles.endpointList}>
              {ENDPOINTS.map(ep => {
                const isOpen = expanded === ep.id
                return (
                  <article className={styles.endpointCard} key={ep.id}>
                    <button
                      className={styles.endpointToggle}
                      type="button"
                      onClick={() => setExpanded(isOpen ? '' : ep.id)}
                      aria-expanded={isOpen}
                    >
                      <div className={styles.endpointLead}>
                        <span className={styles.methodPill}>{ep.method}</span>
                        <div>
                          <div className={styles.endpointTitle}>{ep.title}</div>
                          <div className={styles.endpointPath}>{ep.path}</div>
                        </div>
                      </div>
                      <span className={styles.endpointChevron}>{isOpen ? '−' : '+'}</span>
                    </button>

                    {isOpen && (
                      <div className={styles.endpointBody}>
                        <p className={styles.pricingDetail} style={{ margin: '16px 0' }}>
                          {ep.desc}
                        </p>

                        <div className={styles.endpointMeta}>
                          {/* URL */}
                          <div className={styles.metaBlock}>
                            <span className={styles.metaLabel}>Endpoint URL</span>
                            <div className={styles.inlineCopyRow}>
                              <code className={styles.inlineCode}>{API_BASE}{ep.path}</code>
                              <CopyButton
                                id={`${ep.id}-url`}
                                text={`${API_BASE}${ep.path}`}
                                copy={copy}
                                copiedKey={copiedKey}
                              />
                            </div>
                          </div>

                          {/* Params */}
                          <div className={styles.metaBlock}>
                            <span className={styles.metaLabel}>Query Parameters</span>
                            <ul className={styles.paramList}>
                              {ep.params.map(p => (
                                <li key={p.name}>
                                  <code>{p.name}</code>
                                  {' '}
                                  <strong style={{ fontSize: 10, opacity: 0.7 }}>
                                    {p.required ? '(required)' : '(optional)'}
                                  </strong>
                                  {' — '}{p.desc}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        {/* Request + Response */}
                        <div className={styles.endpointExamples}>
                          <CodeBlock
                            id={`${ep.id}-request`}
                            title="Example Request"
                            code={ep.request}
                            copy={copy}
                            copiedKey={copiedKey}
                          />
                          <CodeBlock
                            id={`${ep.id}-response`}
                            title="Example Response"
                            code={ep.response}
                            copy={copy}
                            copiedKey={copiedKey}
                          />
                        </div>
                      </div>
                    )}
                  </article>
                )
              })}
            </div>

            {/* HTTP Status Codes — reuses metaBlock + authCard patterns */}
            <div style={{ marginTop: 20 }}>
              <div className={styles.sectionKicker} style={{ marginBottom: 14 }}>
                HTTP Status Codes
              </div>
              <div className={styles.authCard}>
                {STATUS_CODES.map(e => (
                  <div key={e.code} className={styles.authHeaderRow}
                    style={{ marginTop: 0, borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '10px 0' }}>
                    <code className={styles.authHeaderValue} style={{ width: 36, flexShrink: 0 }}>
                      {e.code}
                    </code>
                    <span className={styles.endpointTitle} style={{ fontSize: 13, width: 110, flexShrink: 0 }}>
                      {e.label}
                    </span>
                    <span className={styles.pricingDetail} style={{ fontSize: 13 }}>{e.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── PRICING ── */}
          <section id="pricing" className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionKicker}>Pricing</div>
              <h2 className={styles.sectionTitle}>Token-based API access</h2>
              <p className={styles.sectionDesc}>
                API access is priced in BREEZO tokens. Pay on-chain — your quota
                activates immediately after confirmation.
              </p>
            </div>

            <div className={styles.pricingGrid}>
              {PLANS.map(plan => (
                <article
                  key={plan.id}
                  className={`${styles.pricingCard} ${plan.highlight ? styles.pricingFeatured : ''}`}
                >
                  <div className={styles.pricingName}>{plan.name}</div>
                  <div className={styles.pricingRequests}>{plan.requests} req/mo</div>
                  <p className={styles.pricingDetail}>{plan.detail}</p>
                  <div className={styles.tokenPrice}>
                    <span className={styles.tokenIcon}>◈</span>
                    <strong>{plan.tokens} BREEZO</strong>
                  </div>

                  {plan.id === 'enterprise' ? (
                    <Link to="/about" className={styles.planBtn}>{plan.cta}</Link>
                  ) : (
                    <button
                      className={`${styles.planBtn} ${plan.highlight ? styles.primaryAction : ''}`}
                      onClick={() => setBuyPlan(plan)}
                    >
                      {plan.cta}
                    </button>
                  )}
                </article>
              ))}
            </div>

            <div className={styles.noteItem} style={{ marginTop: 16 }}>
              ℹ️ Payments are processed via the Breezo smart contract on Solana.
              BREEZO tokens transfer from your wallet to the treasury on-chain,
              and your API request quota activates on the backend after confirmation.
            </div>
          </section>

          {/* ── EXAMPLES ── */}
          <section id="examples" className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionKicker}>Usage Examples</div>
              <h2 className={styles.sectionTitle}>Integrate in minutes</h2>
              <p className={styles.sectionDesc}>
                Copy-paste examples for common languages.
                Replace <code>YOUR_API_KEY</code> with your actual key.
              </p>
            </div>

            <div className={styles.examplesGrid}>
              {EXAMPLES.map(ex => (
                <CodeBlock
                  key={ex.id}
                  id={ex.id}
                  title={ex.title}
                  code={ex.code}
                  copy={copy}
                  copiedKey={copiedKey}
                />
              ))}
            </div>

            <div className={styles.noteItem} style={{ marginTop: 16 }}>
              ⚡ Rate limits — Basic: 60 req/min · Pro: 300 req/min · Enterprise: custom.
              Exceeding your limit returns <code>429 Too Many Requests</code>.
              Implement exponential backoff for retries.
            </div>
          </section>

        </main>
      </div>
    </div>
  )
}