const qs = require('qs')
const cheerio = require('cheerio')
const axios = require('axios')
const schedule = require('node-schedule')
//
const appid = 'wxffa040cc997c9651'
const secret = 'ab1dd158a323caa014a11ab9bc26b6eb'
const touser = 'oc9tc5tLfNo6y97GvKDdFMq_BAZU'
const template_id = 'RpCtH9L4olg8T-Fj8Cr9azCtsxuKZWJVhqb-Lx0Y4bo'
//
const Local = 'guangxi/nanning'
const WeatherUrl = 'https://tianqi.moji.com/weather/china/' + Local
const OneUrl = 'http://wufazhuce.com/'
const LoveDay = '2022-08-01'
const BirthDay = '2022-08-01'
const Hour = 0
const Minminute = 52
//
const axiosPost = function (url, params = {}) {
  return new Promise((resolve, reject) => {
    axios
      .post(url, params)
      .then((res) => {
        resolve(res)
      })
      .catch((err) => {
        reject(err)
      })
  })
}
//
const axiosGet = function (url, params = {}) {
  return new Promise((resolve, reject) => {
    axios
      .get(url, {
        params
      })
      .then((res) => {
        resolve(res)
      })
      .catch((err) => {
        reject(err)
      })
  })
}
//
function dateDiff(startDate) {
  const sDate = Date.parse(startDate)
  const eDate = Date.now()
  if (sDate > eDate) {
    return 0
  }
  if (sDate === eDate) {
    return 1
  }
  const days = (eDate - sDate) / (1 * 24 * 60 * 60 * 1000)
  return days.toFixed()
}
//
function checkRanges(num, ranges) {
  function handle(num, range, type) {
    switch (type) {
      case '[':
        return num >= range
      case '(':
        return num > range
      case ']':
        return num <= range
      case ')':
        return num < range
    }
  }
  let _ranges = ranges.split(/[\]\)],[\[\(]/g)
  let nowRange = []
  return _ranges.some((item) => {
    nowRange = item.match(/[\(\)\[\]]|(\-?(Infinity|0|([1-9]\d*))(\.\d+)?)/g)
    return handle(num, +nowRange[1], nowRange[0]) && handle(num, nowRange[2], nowRange[3])
  })
}

// 获取今日日期
function getToday() {
  return new Date(+new Date() + 8 * 3600 * 1000).toJSON().substr(0, 10).replace(/-/g, ' / ')
}
// 获取星期几
function getDay() {
  return '星期' + '日一二三四五六'.charAt(new Date().getDay())
}
// 获取天气数据
async function getWeatherData() {
  const res = await axiosGet(WeatherUrl)
  if (res.status === 200) {
    let weatherTip = ''
    let threeDaysData = []
    const $ = cheerio.load(res.data)
    $('.wea_tips').each(function (i, elem) {
      weatherTip = $(elem).find('em').text()
    })
    $('.forecast .days').each(function (i, elem) {
      const SingleDay = $(elem).find('li')
      threeDaysData.push({
        Day: $(SingleDay[0])
          .text()
          .replace(/(^\s*)|(\s*$)/g, ''),
        WeatherImgUrl: $(SingleDay[1]).find('img').attr('src'),
        WeatherText: $(SingleDay[1])
          .text()
          .replace(/(^\s*)|(\s*$)/g, ''),
        Temperature: $(SingleDay[2])
          .text()
          .replace(/(^\s*)|(\s*$)/g, ''),
        WindDirection: $(SingleDay[3])
          .find('em')
          .text()
          .replace(/(^\s*)|(\s*$)/g, ''),
        WindLevel: $(SingleDay[3])
          .find('b')
          .text()
          .replace(/(^\s*)|(\s*$)/g, ''),
        Pollution: $(SingleDay[4])
          .text()
          .replace(/(^\s*)|(\s*$)/g, ''),
        PollutionLevel: $(SingleDay[4]).find('strong').attr('class')
      })
    })

    const sortList = ['今天', '明天', '后天']
    const colorList = [
      {
        range: '[-Infinity,50]',
        color: '#8fc31f'
      },
      {
        range: '(50,100]',
        color: '#d7af0e'
      },
      {
        range: '(100,150]',
        color: '#f39800'
      },
      {
        range: '(150,200]',
        color: '#8fc31f'
      },
      {
        range: '(200,300]',
        color: '#5f52a0'
      },
      {
        range: '(300,Infinity]',
        color: '#631541'
      }
    ]
    threeDaysData.sort((a, b) => sortList.findIndex((i) => i === a.Day) - sortList.findIndex((i) => i === b.Day))
    const colorFind = (int) => colorList.find((i) => checkRanges(threeDaysData[int].Pollution.split(' ')[0] * 1, i.range))
    const valueFind = (int) => threeDaysData[int]['Day'] + 'ㅤㅤ' + threeDaysData[int]['WeatherText'] + 'ㅤㅤ' + threeDaysData[int]['Temperature'] + 'ㅤㅤ' + threeDaysData[int]['Pollution']

    const recentWather = {
      today: {
        value: valueFind(0),
        color: colorFind(0)['color']
      },
      tomorrow: {
        value: valueFind(1),
        color: colorFind(1)['color']
      },
      postnatal: {
        value: valueFind(2),
        color: colorFind(2)['color']
      }
    }

    return { weatherTip, recentWather }
  }
}
// 获取ONE数据
async function getOneData() {
  const res = await axiosGet(OneUrl)
  if (res.status === 200) {
    let $ = cheerio.load(res.data)
    let selectItem = $('#carousel-one .carousel-inner .item')
    let todayOne = selectItem[0]
    let todayOneData = {
      imgUrl: $(todayOne).find('.fp-one-imagen').attr('src'),
      type: $(todayOne)
        .find('.fp-one-imagen-footer')
        .text()
        .replace(/(^\s*)|(\s*$)/g, ''),
      text: $(todayOne)
        .find('.fp-one-cita')
        .text()
        .replace(/(^\s*)|(\s*$)/g, '')
    }
    return todayOneData
  }
}
// 获取微信Token
async function getToken() {
  const params = {
    grant_type: 'client_credential',
    appid,
    secret
  }
  const res = await axiosGet('https://api.weixin.qq.com/cgi-bin/token', params)
  return res.data.access_token
}
// 获取有道翻译
async function getTranslate(i) {
  const params = {
    i,
    doctype: 'json'
  }
  const res = await axiosPost('https://fanyi.youdao.com/translate', qs.stringify(params))
  return res.data.translateResult[0][0]['tgt']
}
// 聚合
async function templateMessageSend() {
  const token = await getToken()

  const url = 'https://api.weixin.qq.com/cgi-bin/message/template/send?access_token=' + token
  const date = getToday() + ' ' + getDay()
  const { weatherTip, recentWather } = await getWeatherData()
  const { text: oneDatatext } = await getOneData()
  const tgt = await getTranslate(oneDatatext)
  const loveDay = dateDiff(LoveDay)
  const birthDay = dateDiff(BirthDay)
  const params = {
    touser,
    template_id,
    topcolor: '#ffe65f',
    url: 'http://u6v.cn/5taEPK',
    data: {
      recentWatherText: {
        value: '近期天气预报',
        color: '#00aff0'
      },
      loveDayText: {
        value: '今天是我们在一起的第 ',
        color: '#00aff0'
      },
      birthDayText: {
        value: '距离宝宝的生日还有 ',
        color: '#00aff0'
      },
      day: {
        value: ' 天',
        color: '#00aff0'
      },
      date: {
        value: date,
        color: '#FF1493'
      },
      weatherTip: {
        value: weatherTip,
        color: '#ec687c'
      },
      ...recentWather,
      loveDay: {
        value: loveDay,
        color: '#fb7299'
      },
      birthDay: {
        value: birthDay,
        color: '#fb7299'
      },
      oneData: {
        value: oneDatatext,
        color: '#ED8774'
      },
      enOnData: {
        value: tgt,
        color: '#FFC0CB'
      }
    }
  }
  const res = await axiosPost(url, params)
  console.log(`NodeWechatMessage: ${date}-执行完毕`, res.data)
}

// 定时
const rule = new schedule.RecurrenceRule()
rule.dayOfWeek = [0, new schedule.Range(1, 6)]
rule.hour = Hour
rule.minute = Minminute
console.log('NodeWechatMessage: 开始等待目标时刻...')
schedule.scheduleJob(rule, function () {
  console.log('开始执行任务')
  templateMessageSend()
})

// {{date.DATA}}

// {{weatherTip.DATA}}

// {{today.DATA}}

// {{tomorrow.DATA}}

// {{postnatal.DATA}}

// {{loveDayText.DATA}}{{loveDay.DATA}}{{day.DATA}}

// {{birthDayText.DATA}} {{birthDay.DATA}}{{day.DATA}}

// {{oneData.DATA}}

// {{enOnData.DATA}}

// {{recentWatherText.DATA}}
