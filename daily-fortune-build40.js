import {sexagenaryDay} from './birth-day-pillar-build40.js';
const ELEMENT_ORDER=['木','火','土','金','水'];
const THEMES={木:'伸ばす・始める',火:'表現する・動く',土:'整える・守る',金:'決める・磨く',水:'考える・流れを読む'};
export function buildDailyFortune({birthDate,targetDate}){
 const birth=sexagenaryDay(birthDate),today=sexagenaryDay(targetDate);
 if(birth.status!=='OK'||today.status!=='OK')return {status:'INVALID_DATE'};
 const bi=ELEMENT_ORDER.indexOf(birth.element),ti=ELEMENT_ORDER.indexOf(today.element);
 const delta=(ti-bi+5)%5;
 const tone=['安定','追い風','切替','慎重','調整'][delta];
 const score=[78,86,68,61,72][delta];
 return {status:'OK',targetDate,birthDayMaster:birth.dayMaster,todayPillar:today.label,todayElement:today.element,tone,score,
  headline:`今日は「${THEMES[today.element]}」を意識する日`,
  message:`${birth.dayMaster}日生まれのあなたは、${today.label}の日は${tone}を意識すると流れを整えやすいでしょう。大きな断定ではなく、今日の行動を決める小さな目安として使ってください。`,
  entertainmentOnly:true};
}
export function dailyFortuneEmailPayload(reading){
 if(reading?.status!=='OK')throw new Error('daily fortune reading required');
 const subject=`今日の総合占い｜${reading.targetDate}`;
 const text=`${reading.headline}\n\n${reading.message}\n\n今日の目安: ${reading.score}/100\n※占術・エンターテインメントとしてお楽しみください。`;
 const html=`<h1>${reading.headline}</h1><p>${reading.message}</p><p><strong>今日の目安: ${reading.score}/100</strong></p><p><small>占術・エンターテインメントとしてお楽しみください。</small></p>`;
 return {subject,text,html};
}
