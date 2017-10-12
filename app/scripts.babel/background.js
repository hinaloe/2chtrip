'use strict';

chrome.runtime.onInstalled.addListener(details => {
  console.log('previousVersion', details.previousVersion);
});

chrome.contextMenus.create({
  title: '10桁トリップ逆引き',
  contexts: ['selection', 'link'],
  async onclick(info, tab) {
    const trip = findTrip(info.selectionText);
    searchHandler(trip);
  },
});

chrome.omnibox.onInputEntered.addListener((text, disposition)=> {
  const trip = findTrip(text);
  searchHandler(trip);
})

async function searchHandler(trip) {
  if(!trip) {
    ShowErrNotify('有効なトリップが見つかりません');
    return;
  }

  const codes = tripToCodes(trip);
  const res = await fetchDB(codes);
  const resMap = parseBody(res);

  if(!resMap.has(trip)) {
    ShowErrNotify('登録されていないトリップです。');
  } else {
    ShowNotify(resMap.get(trip));
  }
}

/**
 * @param {String} search
 * @param {Number} len
 * @return {String?}
 */
function findTrip(search, len = 10) {
  if(search.includes('◆')) {
    const pos = search.indexOf('◆') + 1;
    const trip = search.slice(pos, pos+len);
    if(isValidTrip(trip, len)) return trip;
  } else if (isValidTrip(search, len)) {
    return search;
  }

}

/**
 * @param {String} trip
 * @param {Number} length
 * @return {Boolean}
 */
function isValidTrip(trip, length = 10) {
  return new RegExp(`^[a-zA-Z0-9\./]{${length}}$`).test(trip);
}

/**
 * @param {String} text
 * @return {Boolean}
 */
function copyText(text) {
  const s = window.getSelection();
  if(s.rangeCount > 0) s.removeAllRanges();
  const el = document.createElement('span');
  el.textContent = text;
  document.body.appendChild(el);

  const range = document.createRange();
  range.selectNode(el);
  s.addRange(range);

  let result = false;
  try {
    result = document.execCommand('copy');
  } catch (e) {console.error(e);}

  document.body.removeChild(el);
  return result;
}

/**
 * @param {String} text
 * @return {Notification}
 */
function ShowNotify(origText) {
  const notify = new Notification(`「${origText}」がみつかりました。`, {
    body: 'クリックしてコピー',
    icon: '../images/icon-128.png',
  });
  notify.onclick = ()=> copyText(origText);
  return notify;
}

function ShowErrNotify(title, body) {
  const notify = new Notification(title,{
    body,
    icon: '../images/icon-128.png',
  });
  notify.onclick = ()=> copyText(origText);
  return notify;
}

const charTable = {'0':'00','1':'01','2':'02','3':'03','4':'04','5':'05','6':'06','7':'07','8':'08','9':'09','a':'10','b':'11','c':'12','d':'13','e':'14','f':'15','g':'16','h':'17','i':'18','j':'19','k':'20','l':'21','m':'22','n':'23','o':'24','p':'25','q':'26','r':'27','s':'28','t':'29','u':'30','v':'31','w':'32','x':'33','y':'34','z':'35','A':'40','B':'41','C':'42','D':'43','E':'44','F':'45','G':'46','H':'47','I':'48','J':'49','K':'50','L':'51','M':'52','N':'53','O':'54','P':'55','Q':'56','R':'57','S':'58','T':'59','U':'60','V':'61','W':'62','X':'63','Y':'64','Z':'65','.':'70','/':'71'};

function tripToCodes(trip) {
  return [...trip].map(str=>charTable[str]);
}

async function fetchDB(charCodes) {
  const url = `http://2ch-trip.xyz/2/${charCodes.slice(0,2).join('')}.php?table=${charCodes.slice(0,5).join('')}`;
  const res = await fetch(url);
  if(!res.ok) {
    throw new Error(res.statusText);
  }
  return res.text();
}

function parseBody (body) {
  let res = body.slice(body.indexOf('10 digit ===<hr>')+17);
  res = res.slice(0,res.indexOf('\n<br>\n<hr>=== 12 digit ')).split('\n<br>\n')
  res = res.map(item=> item.split(' &nbsp;  '));
  const map = new Map();
  for(const [key,val] of res) {
    map.set(key, val);
  }

  return map;
}
