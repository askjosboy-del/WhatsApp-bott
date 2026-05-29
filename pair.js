const makeWASocket = require('@whiskeysockets/baileys').default
const {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys')

const pino = require('pino')
const readline = require('readline')

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

function ask(q) {
  return new Promise(res => rl.question(q, ans => res(ans)))
}

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('./session')

  const { version } = await fetchLatestBaileysVersion()

  const sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, pairingCode } = update

    if (pairingCode) {
      console.log("\n🔗 PAIRING CODE:", pairingCode)
      console.log("Go WhatsApp → Linked Devices → Link with phone number\n")
    }

    if (connection === 'close') {
      const reason = lastDisconnect?.error?.output?.statusCode

      console.log("❌ Disconnected:", reason)

      if (reason !== DisconnectReason.loggedOut) {
        console.log("🔁 Restarting...")
        startBot()
      }
    }

    if (connection === 'open') {
      console.log("✅ Connected successfully")
    }
  })

  const number = await ask("Enter WhatsApp number (country code, no +): ")
  await sock.requestPairingCode(number)

  rl.close()
}

startBot()
