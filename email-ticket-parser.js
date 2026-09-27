/* 予約確認メール用の解析強化。解析結果はブラウザ内のフォームにのみ反映する。 */
(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const airportCodes=new Set('NRT HND KIX ITM CTS FUK OKA NGO TPE TSA ICN GMP HKG PEK SIN BKK DMK KUL SGN HAN MNL DPS LAX SFO JFK EWR ORD HNL YVR YYZ LHR CDG FRA AMS FCO MAD ZRH IST DXB DOH TAS UGC SYD MEL AKL'.split(' '));
  const airlines=[
    ['ANA',['ANA','ALL NIPPON','NH']],['JAL',['JAL','JAPAN AIRLINES','JL']],['Peach',['PEACH','MM']],['Jetstar',['JETSTAR','GK','3K','JQ']],['ZIPAIR',['ZIPAIR','ZG']],['Air China',['AIR CHINA','CA']],['Uzbekistan Airways',['ウズベキスタン航空','UZBEKISTAN AIRWAYS','HY']],['EVA Air',['EVA AIR','BR']],['China Airlines',['CHINA AIRLINES','CI']],['Singapore Airlines',['SINGAPORE AIRLINES','SQ']],['Cathay Pacific',['CATHAY','CX']],['Thai Airways',['THAI AIRWAYS','TG']],['United',['UNITED','UA']],['Delta',['DELTA','DL']],['American Airlines',['AMERICAN','AA']],['Air Canada',['AIR CANADA','AC']],['Lufthansa',['LUFTHANSA','LH']],['Emirates',['EMIRATES','EK']],['Qatar Airways',['QATAR','QR']]
  ];
  const set=(id,value)=>{const el=$(id);if(el&&value!=null&&value!=='')el.value=value;};
  function airlineOf(up){
    for(const [name,keys] of airlines){
      for(const k of keys){
        const escaped=k.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
        const isName=k.length>3||k==='ANA'||k==='JAL';
        if(isName?new RegExp('\\b'+escaped+'\\b').test(up):new RegExp('\\b'+escaped+'\\s*\\d{1,4}[A-Z]?\\b').test(up))return name;
      }
    }
    return '';
  }
  function flightOf(up,airline){
    const labeled=up.match(/(?:FLIGHT(?:\s*(?:NO|NUMBER))?|便名|フライト番号)\s*[:#：]?\s*([A-Z0-9]{2,3}\s?\d{1,4}[A-Z]?)/i);
    if(labeled)return labeled[1].replace(/\s+/g,' ');
    const allowed=airlines.find(x=>x[0]===airline)?.[1].filter(x=>x.length<=3)||[];
    /* 航空会社コードは英字だけに限定する。HY052 を HY0 52 のように誤分割しない。 */
    const all=[...up.matchAll(/\b([A-Z]{2,3})\s*(\d{1,4}[A-Z]?)\b/g)].map(x=>x[1]+' '+x[2]);
    return all.find(x=>allowed.some(k=>x.startsWith(k+' ')))||all[0]||'';
  }
  function airportOf(up,label){const m=up.match(label);return m&&airportCodes.has(m[1])?m[1]:'';}
  function datesOf(text){
    const out=[];let m;
    const iso=/(20\d{2})[\/.年-](\d{1,2})[\/.月-](\d{1,2})(?:日)?[^0-9]{0,28}(\d{1,2})[:時](\d{2})/g;
    while((m=iso.exec(text)))out.push(m[1]+'-'+m[2].padStart(2,'0')+'-'+m[3].padStart(2,'0')+'T'+m[4].padStart(2,'0')+':'+m[5]);
    const mons={JANUARY:1,FEBRUARY:2,MARCH:3,APRIL:4,MAY:5,JUNE:6,JULY:7,AUGUST:8,SEPTEMBER:9,OCTOBER:10,NOVEMBER:11,DECEMBER:12,JAN:1,FEB:2,MAR:3,APR:4,JUN:6,JUL:7,AUG:8,SEP:9,OCT:10,NOV:11,DEC:12};
    const en=/(\d{1,2})\s+(JAN(?:UARY)?|FEB(?:RUARY)?|MAR(?:CH)?|APR(?:IL)?|MAY|JUN(?:E)?|JUL(?:Y)?|AUG(?:UST)?|SEP(?:TEMBER)?|OCT(?:OBER)?|NOV(?:EMBER)?|DEC(?:EMBER)?)\s+(20\d{2})[^0-9]{0,28}(\d{1,2}):(\d{2})/gi;
    while((m=en.exec(text))){const mo=mons[m[2].toUpperCase()];if(mo)out.push(m[3]+'-'+String(mo).padStart(2,'0')+'-'+m[1].padStart(2,'0')+'T'+m[4].padStart(2,'0')+':'+m[5]);}
    return [...new Set(out)].sort();
  }
  function parse(text){
    const up=text.toUpperCase();let airline=airlineOf(up),flight=flightOf(up,airline);
    /* 未登録の航空会社でも、IATA便名（例：AB123）を便名候補として拾う。 */
    const genericFlight=(up.match(/\b([A-Z]{2,3})\s*(\d{1,4}[A-Z]?)\b/)||[]);if(!flight&&genericFlight.length){flight=genericFlight[1]+' '+genericFlight[2];if(!airline)airline=genericFlight[1];}
    const pnr=(up.match(/(?:航空会社\s*予約番号|予約番号|予約\s*コード|PNR|BOOKING(?:\s+REFERENCE)?|CONFIRMATION(?:\s+CODE)?|RECORD\s+LOCATOR)[^A-Z0-9]{0,24}([A-Z0-9]{5,8})/i)||[])[1]||'';
    /* 「出発/到着時刻は現地時間」のような注記は誤判定しやすいため、
       単一区間では本文に現れる空港コードの順番を出発→到着として扱う。 */
    const dep='',arr='';
    /* 空港名・Airport・時刻の近傍にある任意のIATA 3文字コードも採用する。
       既知リストにない空港でも、プラットフォーム固有の書式に依存せずに扱える。 */
    const codes=[...up.matchAll(/\b[A-Z]{3}\b/g)].map(m=>({code:m[0],at:m.index||0})).filter(x=>{if(airportCodes.has(x.code))return true;if(/^(PNR|URL|COM|THE|AND|FOR|AIR|PDF|JPY|USD|EUR)$/.test(x.code))return false;const near=up.slice(Math.max(0,x.at-60),x.at+90);return /空港|AIRPORT|\bAPT\b|出発|到着|DEPARTURE|ARRIVAL|\b[0-2]\d:[0-5]\d\b/.test(near);}).map(x=>x.code);
    const d=datesOf(text),tripDate=(text.match(/(20\d{2})年(\d{1,2})月(\d{1,2})日/)||[]),tripTimes=[...text.matchAll(/\b([01]\d|2[0-3]):([0-5]\d)\b/g)].map(x=>x[1]+':'+x[2]),tripDep=tripDate.length&&tripTimes[0]?tripDate[1]+'-'+tripDate[2].padStart(2,'0')+'-'+tripDate[3].padStart(2,'0')+'T'+tripTimes[0]:'',tripArr=tripDate.length&&tripTimes[1]?tripDate[1]+'-'+tripDate[2].padStart(2,'0')+'-'+tripDate[3].padStart(2,'0')+'T'+tripTimes[1]:'',seat=(up.match(/(?:SEAT|座席)\s*[:#：]?\s*([0-9]{1,3}[A-Z])/i)||[])[1]||'',term=(up.match(/(?:TERMINAL|ターミナル)\s*[:#：]?\s*([0-9A-Z]+)/i)||[])[1]||(text.match(/\bT([0-9])\b/)||[])[1]||'';
    const cls=(text.match(/PREMIUM\s+ECONOMY|BUSINESS(?:\s+CLASS)?|ECONOMY(?:\s+CLASS)?|FIRST(?:\s+CLASS)?|プレミアムエコノミー|ビジネス(?:クラス)?|エコノミー(?:クラス)?|ファースト(?:クラス)?/i)||[])[0]||'';
    const checked=(text.match(/(\d{1,2}\s*個\s*\d{1,2}\s*kgまで)/i)||[])[1]||(text.match(/(?:BAGGAGE|LUGGAGE|受託手荷物)[\s\S]{0,35}?(\d{1,2}\s*(?:KG|KGS|個|PIECE|PC))/i)||[])[1]||'',tripChecked=/受託手荷物[\s\S]{0,80}?無料枠なし/i.test(text)?'無料枠なし':'',personal=(text.match(/身の回り品[\s\S]{0,120}?(\d+個、最大重量：\d+kg[^\n]*)/i)||[])[1]||'',carry=(text.match(/機内持込手荷物[\s\S]{0,120}?(\d+個、最大重量：\d+kg[^\n]*)/i)||[])[1]||(text.match(/(?:\d+\s*)?(?:HAND\s*LUGGAGE|CARRY.ON|機内持込(?:手荷物)?|手荷物)\s*\d+\s*(?:KG|KGS)/i)||[])[0]||'',bag=[personal&&'身の回り品：'+personal,carry&&'機内持込：'+carry,(checked||tripChecked)&&'受託：'+(checked||tripChecked)].filter(Boolean).join(' ／ ');
    const money=text.match(/(?:TOTAL|AMOUNT|運賃|合計|料金)[^\n]{0,60}?(JPY|USD|EUR|GBP|TWD|KRW|THB|VND|SGD|HKD|AUD|CAD|PHP|MYR)?\s*([¥$€£]?[\d,]+(?:\.\d{1,2})?)/i)||[];
    const symbol=money[2]&&money[2][0],cur=money[1]||(symbol==='¥'?'JPY':symbol==='$'?'USD':symbol==='€'?'EUR':symbol==='£'?'GBP':'');
    const url=((text.match(/https?:\/\/[^\s\])]+?(?:vieworder|flightsorder)[^\s\])]+/i)||[])[0]||'').replace(/\\&/g,'&'),ckurl=((text.match(/https?:\/\/[^\s\])]+?(?:Bookseat|checkin)[^\s\])]+/i)||[])[0]||'').replace(/\\&/g,'&');
    return {airline,flight,pnr,dep:dep||codes[0]||'',arr:arr||codes.filter(x=>x!==(dep||codes[0]))[0]||'',depAt:d[0]||tripDep,arrAt:d[1]||tripArr,seat,term,cls,bag,cur,price:money[2]?money[2].replace(/[^0-9.]/g,''):'',url,ckurl};
  }
  function dateIn(line){const m=line.match(/(20\d{2})年(\d{1,2})月(\d{1,2})日[\s\S]{0,22}?(\d{1,2}):(\d{2})/);return m?m[1]+'-'+m[2].padStart(2,'0')+'-'+m[3].padStart(2,'0')+'T'+m[4].padStart(2,'0')+':'+m[5]:'';}
  function segmentsOf(text){
    const clean=text.replace(/\*\*/g,'').replace(/<br\s*\/?\s*>/gi,' ').replace(/\r/g,''), pnr=(clean.match(/(?:航空チェックイン参照|PNR|予約番号)\s*\|?\s*([A-Z0-9]{5,10})/i)||[])[1]||'';
    const checked=(clean.match(/(\d+個\s*\d+\s*kgまで)/i)||[])[1]||'',carry=(clean.match(/(?:\d+\s*)?(?:HAND\s*LUGGAGE|CARRY.ON|機内持込(?:手荷物)?|手荷物)\s*\d+\s*(?:KG|KGS)/i)||[])[0]||'',bag=[checked&&'受託：'+checked,carry&&'機内持込：'+carry].filter(Boolean).join(' ／ ');
    const marks=[...clean.matchAll(/Flight\s*\|?\s*([A-Z]{2}\d{1,4})\b/gi)],out=[];
    const row=(part,label)=>{const m=part.match(new RegExp(label+'\\s*\\|?\\s*([^\\n]+)','i'));return m?m[1].replace(/\|.*$/,'').trim():'';};
    marks.forEach((m,i)=>{const part=clean.slice(m.index,marks[i+1]?.index||clean.length), airline=row(part,'Operated by:'), depLine=row(part,'Departure'), arrLine=row(part,'Arrival'), dep=(depLine.match(/\(([A-Z]{3})\)/)||[])[1]||'',arr=(arrLine.match(/\(([A-Z]{3})\)/)||[])[1]||'';if(dep&&arr)out.push({airline:airline||airlineOf(part.toUpperCase())||'',no:m[1],pnr,dep,arr,depAt:dateIn(depLine),arrAt:dateIn(arrLine),bag});});
    return out;
  }
  const AIRPORT={HND:[35.549,139.779,'Asia/Tokyo'],PEK:[40.080,116.584,'Asia/Shanghai'],TAS:[41.257,69.281,'Asia/Tashkent'],UGC:[41.584,60.642,'Asia/Tashkent']};
  const newId=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
  function addSegments(rows){
    const t=trip();t.flights=Array.isArray(t.flights)?t.flights:[];
    rows.forEach(x=>{if(t.flights.some(f=>f.no===x.no&&f.depAt===x.depAt&&f.dep===x.dep))return;const d=AIRPORT[x.dep]||[],a=AIRPORT[x.arr]||[];t.flights.push(Object.assign({id:newId(),term:'',seat:'',cls:'',price:0,pcur:t.base,url:'',ckurl:'',memo:'メール自動登録'},x,{depLat:d[0],depLon:d[1],depTz:d[2],arrLat:a[0],arrLon:a[1],arrTz:a[2]}));});
    saveDb();window.render();
  }
  function install(){
    const button=$('bookingFill'),box=$('bookingImport');if(!button||button.dataset.precise)return;
    button.dataset.precise='1';const title=box.querySelector('b');if(title)title.textContent='予約確認メールから自動入力（詳細）';
    document.addEventListener('click',e=>{
      if(e.target!==button)return;e.preventDefault();e.stopImmediatePropagation();
      const text=$('bookingText').value, rows=segmentsOf(text), r=parse(text);set('flAir',r.airline);set('flNo',r.flight);set('flPnr',r.pnr);set('flDep',r.dep);set('flArr',r.arr);set('flDepAt',r.depAt);set('flArrAt',r.arrAt);set('flSeat',r.seat);set('flTerm',r.term);set('flCls',r.cls);set('flBag',r.bag);set('flCur',r.cur);set('flPrice',r.price);set('flUrl',r.url);set('flCk',r.ckurl);
      const found=Object.entries(r).filter(([,v])=>v).map(([k])=>({airline:'航空会社',flight:'便名',pnr:'PNR',dep:'出発空港',arr:'到着空港',depAt:'日時',seat:'座席',term:'ターミナル',cls:'クラス',bag:'手荷物',price:'料金'})[k]).filter(Boolean);
      const result=$('bookingResult');result.textContent=found.length?'読み取り候補：'+[r.airline,r.flight,r.dep&&r.arr?r.dep+' → '+r.arr:'',r.depAt,r.pnr?'PNR '+r.pnr:''].filter(Boolean).join(' ／ ')+'。予約サイトごとに表記が異なるため、保存前に内容を確認・修正してください。':'読み取れませんでした。メール本文全体を貼り付けてください。';
      if(rows.length>1){const b=document.createElement('button');b.className='mini';b.textContent=rows.length+'区間をまとめて登録';b.onclick=()=>{if(confirm(rows.length+'区間の航空券を登録しますか？'))addSegments(rows);};result.appendChild(document.createTextNode(' '));result.appendChild(b);}
    },true);
  }
  new MutationObserver(install).observe(document.body,{childList:true,subtree:true});install();
})();
