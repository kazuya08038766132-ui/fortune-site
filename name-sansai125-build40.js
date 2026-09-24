import {fiveElementForGrid,elementRelation} from './name-sansai-build40.js';

const E=['木','火','土','金','水'];
const TRAITS={
 木:{core:'成長意欲と柔軟性',work:'育成・企画・改善',money:'将来への投資と積み上げ',love:'相手と一緒に育つ関係',family:'対話しながら家庭を整える'},
 火:{core:'行動力と表現力',work:'発信・決断・前進',money:'機会を捉える機動力',love:'率直で熱量のある関係',family:'明るさと活気を生む'},
 土:{core:'安定感と受容力',work:'継続・管理・支援',money:'堅実な管理と蓄積',love:'安心感を重ねる関係',family:'生活基盤を守り育てる'},
 金:{core:'判断力と規律性',work:'品質・専門性・決断',money:'基準を決めた管理',love:'誠実さと境界を大切にする関係',family:'役割と約束を整える'},
 水:{core:'洞察力と適応力',work:'分析・交渉・情報活用',money:'状況を読んだ柔軟な管理',love:'気持ちを汲み取る関係',family:'変化に合わせて調整する'}
};
function relText(r){return r==='相生'?'流れを後押ししやすい':r==='比和'?'性質を強めやすい':r==='相剋'?'緊張や調整課題が出やすい':'判定保留';}
function level(a,b){const rs=[a,b],bad=rs.filter(x=>x==='相剋').length,good=rs.filter(x=>x==='相生').length;if(bad===0&&good===2)return '調和型';if(bad===0)return '安定型';if(bad===1)return '調整型';return '課題意識型';}
function make(h,p,e){const hp=elementRelation(h,p),pe=elementRelation(p,e),type=level(hp,pe),t=TRAITS[p];return Object.freeze({pattern:`${h}${p}${e}`,elements:{heaven:h,person:p,earth:e},relations:{heavenPerson:hp,personEarth:pe},type,summary:`${p}の${t.core}が中心。天→人は${hp}で${relText(hp)}一方、人→地は${pe}で${relText(pe)}配置として読みます。`,categories:{personality:`人格の${p}を軸に、${t.core}を持ち味として読みます。${type==='課題意識型'?'勢いだけで決めず、環境との折り合いを意識すると安定しやすい配置です。':'周囲との関係を整えるほど持ち味を活かしやすい配置です。'}`,work:`仕事面は${t.work}と相性を見ます。${pe==='相剋'?'足元の条件確認を丁寧にすることが補助テーマです。':'継続できる仕組みを作ることが補助テーマです。'}`,money:`金運は${t.money}を基本姿勢として読みます。数理の吉凶とは別軸なので、三才だけで金銭結果を断定しません。`,relationships:`対人面は${t.core}の出し方が鍵。${hp==='相剋'?'立場や期待の違いを言葉で調整する余地があります。':'周囲との呼吸を合わせることで良さを出しやすい配置です。'}`,loveMarriage:`恋愛・結婚は${t.love}を意識する読みです。相手との相性そのものをこの配置だけで決めません。`,family:`家庭面は${t.family}傾向を補助的に読みます。人格→地格が${pe}のため、${relText(pe)}関係として扱います。`},disclaimer:'三才配置は伝統的姓名判断の補助解釈です。流派差があり、性格や将来を科学的に判定するものではありません。'});}
export const SANSAI_125=Object.freeze(Object.fromEntries(E.flatMap(h=>E.flatMap(p=>E.map(e=>{const x=make(h,p,e);return [x.pattern,x]})))));
export function interpretSansai125(fiveGrid){if(!fiveGrid||fiveGrid.status!=='OK')return {status:'DATA_VERIFY'};const h=fiveElementForGrid(fiveGrid.heaven),p=fiveElementForGrid(fiveGrid.person),e=fiveElementForGrid(fiveGrid.earth);const entry=SANSAI_125[`${h}${p}${e}`];return entry?{status:'OK',...entry,policy:'SANSAI_125_ORIGINAL_COPY_V1'}:{status:'DATA_VERIFY'};}
export const NAME_SANSAI125_VERSION='RC231-1';
