#!/usr/bin/env node

const cookies = process.env.COOKIE.split('\n').map(s => s.trim())
const games = process.env.GAMES.split('\n').map(s => s.trim())
const discordWebhook = process.env.DISCORD_WEBHOOK
const discordUser = process.env.DISCORD_USER

// --- Game endpoints ---
const endpoints = {
  zzz: 'https://sg-act-nap-api.hoyolab.com/event/luna/zzz/os/sign?act_id=e202406031448091',
  gi:  'https://sg-hk4e-api.hoyolab.com/event/sol/sign?act_id=e202102251931481',
  hsr: 'https://sg-public-api.hoyolab.com/event/luna/os/sign?act_id=e202303301540311',
  hi3: 'https://sg-public-api.hoyolab.com/event/mani/sign?act_id=e202110291205111',
  tot: 'https://sg-public-api.hoyolab.com/event/luna/os/sign?act_id=e202202281857121',
}

const gameNames = {
  zzz: '**ZZZ**',
  gi: '**原神**',
  hsr: '**崩鐵**',
  hi3: '**崩壞 3rd**',
  tot: '**未定事件簿**'
}

const successCodes = {
  '0': '成功簽到！',
  '-5003': '今日已簽到過！'
}

const errorCodes = {
  '-100': '錯誤：未登入（Cookie 無效）用無痕的那個方法！',
  '-10002': '尚未遊玩此遊戲'
}

let hasErrors = false
let messages = []


function log(type, string) {
  console[type](string)
  if (type === 'error') hasErrors = true
  messages.push({ type, string })
}


// SIGN FUNCTION
async function run(cookie, gameList) {
  const list = gameList.split(' ')

  for (let game of list) {
    game = game.toLowerCase()

    if (!(game in endpoints)) {
      log("error", `遊戲 ${game} 無效，可用遊戲: zzz, gi, hsr, hi3, tot`)
      continue
    }

    const endpoint = endpoints[game]
    const url = new URL(endpoint)
    const actId = url.searchParams.get("act_id")

    url.searchParams.set("lang", "en-us")

    const body = JSON.stringify({
      lang: "en-us",
      act_id: actId
    })

    const headers = new Headers()
    headers.set("accept", "application/json")
    headers.set("content-type", "application/json;charset=UTF-8")
    headers.set("cookie", cookie)
    headers.set("x-rpc-signgame", game)
    headers.set("user-agent", "Mozilla/5.0")

    const res = await fetch(url, {
      method: "POST",
      headers,
      body
    })

    const json = await res.json()
    const code = String(json.retcode)

    if (successCodes[code]) {
      log("info", `${gameNames[game]}：${successCodes[code]}`)
      continue
    }

    if (errorCodes[code]) {
      log("error", `${gameNames[game]}：${errorCodes[code]}`)
      continue
    }

    log("error", `${gameNames[game]}：未知錯誤，請回報 Issues`)
  }
}


// DC WEBHOOK
async function discordWebhookSend() {
  const embeds = []
  let temp = []
  let accountName = null
  let acctIndex = 0

  for (const msg of messages) {
    if (msg.string.startsWith("登入帳號：")) {

      // Finish previous embed
      if (accountName !== null) {
        embeds.push({
          title: accountName,
          description: temp.join("\n"),
          color:
            accountName === "魚"
              ? 0xA627E4
              : acctIndex % 2 === 0 ? 0x4BD1FF : 0x44FF88
        })
      }

      temp = []
      accountName = msg.string.replace("登入帳號：", "")
      acctIndex++
      continue
    }

    temp.push(msg.string)
  }

  // Final account embed
  if (accountName) {
    embeds.push({
      title: accountName,
      description: temp.join("\n"),
      color:
        accountName === "魚"
          ? 0xA627E4
          : acctIndex % 2 === 0 ? 0x4BD1FF : 0x44FF88
    })
  }

  const payload = {
    embeds,
    content: discordUser ? `<@${discordUser}>` : null
  }

  await fetch(discordWebhook, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  })
}




for (const index in cookies) {
  const name = Number(index) === 0 ? "魚" : `帳號 ${Number(index) + 1}`
  log("info", `登入帳號：${name}`)
  await run(cookies[index], games[index])
}

if (discordWebhook) {
  await discordWebhookSend()
}

if (hasErrors) throw new Error("有錯誤!!!")
