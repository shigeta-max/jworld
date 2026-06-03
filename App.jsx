import { useState, useEffect, useRef, useCallback } from "react";

/* ============================================================
   Jワールド（リライルクエスト）マスター本体 v0.4
   ------------------------------------------------------------
   ■ 世界観: クライアント＝モンスター（会計事務所RPG）
   ■ ステータスの意味（実務）:
     HP=予算/顧問料  こうげき=ITリテラシー  ぼうぎょ=資料の正確性
     とくこう=公私の切り分け  とくぼう=スケジュール管理  すばやさ=レスポンス
   ■ 18タイプ＋タイプ相性／特性（アビリティ）／レベル習得／進化
   ■ バトル・育成がメイン。フィールドは簡易。
   ============================================================ */

const TYPE_INFO = {
  "ノーマル":{color:"#5F5E5A",bg:"#F1EFE8",border:"#B4B2A9",hard:false},
  "ひこう":{color:"#41699E",bg:"#EAF0FA",border:"#9DBCE0",hard:false},
  "エスパー":{color:"#993556",bg:"#FBEAF0",border:"#E59FB6",hard:false},
  "むし":{color:"#5C7416",bg:"#F0F4DE",border:"#B7C772",hard:false},
  "はがね":{color:"#4A6076",bg:"#EAF0F5",border:"#9DB4C7",hard:false},
  "じめん":{color:"#7A5C20",bg:"#F5EEDD",border:"#CBB67E",hard:false},
  "フェアリー":{color:"#A8456E",bg:"#FBEAF2",border:"#E89FBE",hard:false},
  "ほのお":{color:"#993C1D",bg:"#FAECE7",border:"#EAA888",hard:true},
  "みず":{color:"#185FA5",bg:"#E6F1FB",border:"#8FB9E3",hard:true},
  "くさ":{color:"#356211",bg:"#EAF3DE",border:"#97C459",hard:true},
  "でんき":{color:"#9C6210",bg:"#FAEEDA",border:"#EBB45E",hard:true},
  "こおり":{color:"#1B6E7E",bg:"#E3F5F8",border:"#8FCCD6",hard:true},
  "かくとう":{color:"#8C3527",bg:"#FBEAE7",border:"#E0A095",hard:true},
  "どく":{color:"#5E3790",bg:"#F0EAFB",border:"#B69FE0",hard:true},
  "いわ":{color:"#6E5E42",bg:"#F1ECE2",border:"#C2B190",hard:true},
  "ゴースト":{color:"#534178",bg:"#EDE9F7",border:"#AFA0D6",hard:true},
  "ドラゴン":{color:"#33337A",bg:"#E8E8FA",border:"#9D9DDD",hard:true},
  "あく":{color:"#333333",bg:"#ECECEC",border:"#9A9A9A",hard:true},
};

/* ===== タイプ相性（attacker → {defender:倍率}）====== */
const TYPE_CHART = {
  "ノーマル":{いわ:0.5,はがね:0.5,ゴースト:0},
  "ほのお":{くさ:2,こおり:2,むし:2,はがね:2,みず:0.5,ほのお:0.5,いわ:0.5,ドラゴン:0.5},
  "みず":{ほのお:2,じめん:2,いわ:2,みず:0.5,くさ:0.5,ドラゴン:0.5},
  "くさ":{みず:2,じめん:2,いわ:2,ほのお:0.5,くさ:0.5,ひこう:0.5,むし:0.5,どく:0.5,はがね:0.5,ドラゴン:0.5},
  "でんき":{みず:2,ひこう:2,でんき:0.5,くさ:0.5,ドラゴン:0.5,じめん:0},
  "こおり":{くさ:2,じめん:2,ひこう:2,ドラゴン:2,ほのお:0.5,みず:0.5,こおり:0.5,はがね:0.5},
  "かくとう":{ノーマル:2,こおり:2,いわ:2,あく:2,はがね:2,どく:0.5,ひこう:0.5,エスパー:0.5,むし:0.5,フェアリー:0.5,ゴースト:0},
  "どく":{くさ:2,フェアリー:2,どく:0.5,じめん:0.5,いわ:0.5,ゴースト:0.5,はがね:0},
  "じめん":{ほのお:2,でんき:2,どく:2,いわ:2,はがね:2,くさ:0.5,むし:0.5,ひこう:0},
  "ひこう":{くさ:2,かくとう:2,むし:2,でんき:0.5,いわ:0.5,はがね:0.5},
  "エスパー":{かくとう:2,どく:2,エスパー:0.5,はがね:0.5,あく:0},
  "むし":{くさ:2,エスパー:2,あく:2,ほのお:0.5,かくとう:0.5,どく:0.5,ひこう:0.5,ゴースト:0.5,はがね:0.5,フェアリー:0.5},
  "いわ":{ほのお:2,こおり:2,ひこう:2,むし:2,かくとう:0.5,じめん:0.5,はがね:0.5},
  "ゴースト":{エスパー:2,ゴースト:2,あく:0.5,ノーマル:0},
  "ドラゴン":{ドラゴン:2,はがね:0.5,フェアリー:0},
  "あく":{エスパー:2,ゴースト:2,かくとう:0.5,あく:0.5,フェアリー:0.5},
  "はがね":{こおり:2,いわ:2,フェアリー:2,ほのお:0.5,みず:0.5,でんき:0.5,はがね:0.5},
  "フェアリー":{かくとう:2,ドラゴン:2,あく:2,ほのお:0.5,どく:0.5,はがね:0.5},
};
function typeMultiplier(moveType, defender){
  const chart=TYPE_CHART[moveType]||{}; let m=1;
  if(defender.type1) m*=(chart[defender.type1]??1);
  if(defender.type2) m*=(chart[defender.type2]??1);
  return m;
}
function effLabel(m){ return m>1.5?"こうかは ばつぐんだ！":m===0?"こうかが ないようだ…":m<1?"こうかは いまひとつ…":""; }

/* ===== 特性（アビリティ）===== */
const ABILITIES = {
  // 良い特性
  "きんべん":{good:true,desc:"毎ターン 資料が届く（攻撃後HP回復）"},
  "しんらい":{good:true,desc:"一任してくれる（こうげき安定）"},
  "そうだんじょうず":{good:true,desc:"質問が的確"},
  "けいかくてき":{good:true,desc:"納税資金を積み立て"},
  "すなお":{good:true,desc:"指摘を素直に改善"},
  "きろくへき":{good:true,desc:"資料を完璧に保管"},
  // 悪い特性
  "なまけ":{good:false,desc:"決算直前まで資料をくれない（時々サボる）"},
  "プレッシャー":{good:false,desc:"返信が遅いとすぐ電話"},
  "しんぱいしょう":{good:false,desc:"些細なズレで深夜連絡"},
  "ダブルブッキング":{good:false,desc:"複数の顧問に同じ質問"},
  "かいざん":{good:false,desc:"資料を自己流で修正"},
  "いかく":{good:false,desc:"威圧的な態度"},
};

/* ===== 技データベース ===== */
const MOVES = {
  "たいあたり":{power:20,type:"atk",mtype:"ノーマル"},
  "のしかかり":{power:45,type:"atk",mtype:"ノーマル"},
  "はっぱカッター":{power:35,type:"atk",mtype:"くさ"},
  "ソーラービーム":{power:60,type:"spa",mtype:"くさ"},
  "ひのこ":{power:38,type:"spa",mtype:"ほのお"},
  "かえんほうしゃ":{power:58,type:"spa",mtype:"ほのお"},
  "みずでっぽう":{power:38,type:"spa",mtype:"みず"},
  "ハイドロポンプ":{power:60,type:"spa",mtype:"みず"},
  "でんげき":{power:40,type:"spa",mtype:"でんき"},
  "10まんボルト":{power:58,type:"spa",mtype:"でんき"},
  "メタルクロー":{power:40,type:"atk",mtype:"はがね"},
  "アイアンテール":{power:55,type:"atk",mtype:"はがね"},
  "ねんりき":{power:40,type:"spa",mtype:"エスパー"},
  "サイコキネシス":{power:58,type:"spa",mtype:"エスパー"},
  "ようせいのかぜ":{power:38,type:"spa",mtype:"フェアリー"},
  "マジカルシャイン":{power:55,type:"spa",mtype:"フェアリー"},
  "したでなめる":{power:30,type:"spa",mtype:"ゴースト"},
  "シャドーボール":{power:55,type:"spa",mtype:"ゴースト"},
  "かみつく":{power:40,type:"atk",mtype:"あく"},
  "あくのはどう":{power:55,type:"spa",mtype:"あく"},
  "りゅうのいぶき":{power:40,type:"spa",mtype:"ドラゴン"},
  "りゅうせいぐん":{power:60,type:"spa",mtype:"ドラゴン"},
  "じしん":{power:60,type:"atk",mtype:"じめん"},
};
function moveObj(name){ const d=MOVES[name]||{power:20,type:"atk",mtype:"ノーマル"}; return {name,...d}; }

/* ===== 種族データ（クライアント＝モンスター）===== */
const SPECIES = {
  routinen:{ name:"ルーチン", type1:"ノーマル", type2:"", flavor:"ルーティーン型。可もなく不可もなく。",
    base:{hp:45,atk:40,def:45,spa:35,spd:50,spe:45}, ability:"きろくへき",
    appearance:{bodyColor:"#C9C3B0",eyeColor:"#3A382F",shape:"round",accent:"#E5E1D3"},
    learnset:{1:"たいあたり",1.1:"のしかかり"}, evolveAt:15, evolveTo:"routineking" },
  routineking:{ name:"ルーチンキング", type1:"ノーマル", type2:"", flavor:"安定の極み。毎期おなじみ。",
    base:{hp:75,atk:60,def:70,spa:50,spd:78,spe:55}, ability:"しんらい",
    appearance:{bodyColor:"#9E9A88",eyeColor:"#2C2A22",shape:"wide",accent:"#C9C3B0"},
    learnset:{1:"のしかかり"}, evolveAt:null },

  satori:{ name:"サトリ", type1:"エスパー", type2:"", flavor:"経営者が会計を理解。話が早い。",
    base:{hp:52,atk:45,def:52,spa:70,spd:62,spe:55}, ability:"そうだんじょうず",
    appearance:{bodyColor:"#E59FB6",eyeColor:"#72243E",shape:"round",accent:"#FBEAF0"},
    learnset:{1:"ねんりき",15:"サイコキネシス"}, evolveAt:null },

  koyume:{ name:"コユメ", type1:"フェアリー", type2:"", flavor:"小規模優良。利益率高く資料も綺麗。",
    base:{hp:50,atk:42,def:55,spa:55,spd:62,spe:52}, ability:"すなお",
    appearance:{bodyColor:"#F0B9D2",eyeColor:"#A8456E",shape:"round",accent:"#FFFFFF"},
    learnset:{1:"ようせいのかぜ",15:"マジカルシャイン"}, evolveAt:null },

  genkin:{ name:"ゲンキン", type1:"くさ", type2:"", flavor:"現金主義レトロ型。手書き伝票多し。",
    base:{hp:52,atk:48,def:55,spa:40,spd:48,spe:36}, ability:"なまけ",
    appearance:{bodyColor:"#97C459",eyeColor:"#27500A",shape:"tall",accent:"#EAF3DE"},
    learnset:{1:"はっぱカッター",14:"ソーラービーム"}, evolveAt:16, evolveTo:"gennama" },
  gennama:{ name:"ゲンナマ", type1:"くさ", type2:"じめん", flavor:"レトロを極めた現金の主。",
    base:{hp:78,atk:68,def:72,spa:55,spd:62,spe:42}, ability:"なまけ",
    appearance:{bodyColor:"#5E8C3E",eyeColor:"#1B3A07",shape:"tall",accent:"#C7E29E"},
    learnset:{1:"ソーラービーム",18:"じしん"}, evolveAt:null },

  burnup:{ name:"バーンナップ", type1:"ほのお", type2:"", flavor:"急成長・急拡大型。常に炎上気味。",
    base:{hp:50,atk:65,def:42,spa:62,spd:45,spe:64}, ability:"プレッシャー",
    appearance:{bodyColor:"#F0997B",eyeColor:"#712B13",shape:"sharp",accent:"#FAC775"},
    learnset:{1:"ひのこ",15:"かえんほうしゃ"}, evolveAt:16, evolveTo:"megaventure" },
  megaventure:{ name:"メガベンチャー", type1:"ほのお", type2:"はがね", flavor:"上場視野の大型成長企業。",
    base:{hp:72,atk:92,def:66,spa:86,spd:60,spe:86}, ability:"いかく",
    appearance:{bodyColor:"#C0392B",eyeColor:"#3A0A04",shape:"sharp",accent:"#EF9F27"},
    learnset:{1:"かえんほうしゃ",1.1:"アイアンテール"}, evolveAt:null },

  jirihin:{ name:"ジリヒン", type1:"みず", type2:"", flavor:"資金繰り型。常にキャッシュがカツカツ。",
    base:{hp:54,atk:48,def:50,spa:55,spd:58,spe:45}, ability:"しんぱいしょう",
    appearance:{bodyColor:"#7FB5E6",eyeColor:"#0C447C",shape:"round",accent:"#E6F1FB"},
    learnset:{1:"みずでっぽう",15:"ハイドロポンプ"}, evolveAt:16, evolveTo:"shikinpu" },
  shikinpu:{ name:"シキンプ", type1:"みず", type2:"", flavor:"資金繰りを乗り越えた水の王。",
    base:{hp:82,atk:65,def:72,spa:84,spd:80,spe:55}, ability:"けいかくてき",
    appearance:{bodyColor:"#3457A8",eyeColor:"#08233F",shape:"round",accent:"#7FB5E6"},
    learnset:{1:"ハイドロポンプ"}, evolveAt:null },

  tairyo:{ name:"タイリョー", type1:"でんき", type2:"はがね", flavor:"多取引・ボリューム型。仕訳量が膨大。",
    base:{hp:56,atk:60,def:50,spa:75,spd:55,spe:82}, ability:"きんべん",
    appearance:{bodyColor:"#EF9F27",eyeColor:"#633806",shape:"sharp",accent:"#85B7EB"},
    learnset:{1:"でんげき",1.1:"メタルクロー",16:"10まんボルト"}, evolveAt:null },

  teppeki:{ name:"テッペキ", type1:"はがね", type2:"", flavor:"財務基盤・盤石型。数字がぶれない。",
    base:{hp:65,atk:55,def:82,spa:35,spd:68,spe:30}, ability:"しんらい",
    appearance:{bodyColor:"#9AA0A6",eyeColor:"#2C2C2A",shape:"wide",accent:"#D0D3D6"},
    learnset:{1:"メタルクロー",14:"アイアンテール"}, evolveAt:null },

  miuchi:{ name:"ミウチ", type1:"ゴースト", type2:"", flavor:"身内取引・グループ型。資金貸借が複雑。",
    base:{hp:55,atk:50,def:55,spa:62,spd:58,spe:55}, ability:"ダブルブッキング",
    appearance:{bodyColor:"#9C8CC4",eyeColor:"#534178",shape:"tall",accent:"#EDE9F7"},
    learnset:{1:"したでなめる",15:"シャドーボール"}, evolveAt:null },

  grayzone:{ name:"グレゾン", type1:"あく", type2:"", flavor:"グレーゾーン型。常にリスクをはらむ。",
    base:{hp:58,atk:68,def:52,spa:58,spd:52,spe:62}, ability:"かいざん",
    appearance:{bodyColor:"#5A5A5A",eyeColor:"#161616",shape:"sharp",accent:"#9A9A9A"},
    learnset:{1:"かみつく",15:"あくのはどう"}, evolveAt:null },

  doragon:{ name:"ドラそうけん", type1:"ドラゴン", type2:"", flavor:"大型・複合型。あらゆる論点を内包する王。",
    base:{hp:85,atk:92,def:78,spa:88,spd:78,spe:80}, ability:"いかく",
    appearance:{bodyColor:"#4A4AA8",eyeColor:"#1A1A4A",shape:"sharp",accent:"#9D9DDD"},
    learnset:{1:"りゅうのいぶき",1.1:"かみつく",18:"りゅうせいぐん"}, evolveAt:null },
};

const STAT_LABELS = [
  { key:"hp",  label:"HP",       sub:"予算" },
  { key:"atk", label:"こうげき", sub:"IT" },
  { key:"def", label:"ぼうぎょ", sub:"資料" },
  { key:"spa", label:"とくこう", sub:"公私" },
  { key:"spd", label:"とくぼう", sub:"計画" },
  { key:"spe", label:"すばやさ", sub:"速さ" },
];

function calcStat(base,level,isHp){ return isHp?Math.floor(base*2*level/100)+level+10:Math.floor(base*2*level/100)+5; }
function stats(mon){ const b=SPECIES[mon.speciesId].base; return {
  maxHp:calcStat(b.hp,mon.level,true), atk:calcStat(b.atk,mon.level), def:calcStat(b.def,mon.level),
  spa:calcStat(b.spa,mon.level), spd:calcStat(b.spd,mon.level), spe:calcStat(b.spe,mon.level) }; }
function expToNext(level){ return level*level*8; }
function movesForLevel(speciesId,level){
  const ls=SPECIES[speciesId].learnset;
  const names=Object.entries(ls).filter(([lv])=>Number(lv)<=level).map(([,n])=>n);
  return [...new Set(names)].slice(-4).map(moveObj);
}
function makeMonster(speciesId,level=5){
  const sp=SPECIES[speciesId];
  const m={ uid:`${speciesId}-${Date.now()}-${Math.floor(Math.random()*9999)}`,
    speciesId, name:sp.name, type1:sp.type1, type2:sp.type2, ability:sp.ability,
    appearance:{...sp.appearance}, base:{...sp.base}, level, exp:0,
    moves:movesForLevel(speciesId,level) };
  m.curHp=calcStat(sp.base.hp,level,true);
  return m;
}

/* ===== グラフィック担当差し込み: MonsterSprite（画像対応ハイブリッド） =====
   ◆ ななちゃんへ:
     1. ドット絵PNGを用意したら、下の SPRITE_IMAGES に
        speciesId をキーにして画像のパス（またはURL）を登録するだけ。
        例) emberon: "/sprites/emberon.png"
        （ローカル開発では public/sprites/ に画像を置き、"/sprites/xxx.png" で参照）
     2. 登録された種族は その画像で表示され、
        未登録の種族は これまでの自動ドット絵で表示されます（混在OK）。
     ※ ジムリーダー等の人物画像は NPC_IMAGES（後日追加）で同様に扱えます。 */
const SPRITE_IMAGES = {
  // emberon: "/sprites/emberon.png",
  // doragon: "/sprites/doragon.png",
};

/* ◆ ななちゃんへ（人物の立ち絵）:
   ジムリーダーや王などの人物ドット絵PNGを用意したら、
   NPC_IMAGES に「人物ID（portrait）」をキーにしてパスを登録。
     例) gym_leader: "/portraits/gym_leader.png"
   そして MAPS の対象NPCに portrait:"gym_leader" を足すと、
   会話ウィンドウにその立ち絵が出ます（未登録なら従来どおり文字だけ）。
   推奨: 縦長 PNG・背景透過・GBA風モノクロ。 */
const NPC_IMAGES = {
  // gym_leader: "/portraits/gym_leader.png",
  // king: "/portraits/king.png",
};

function shade(hex,amt){
  try{ const n=parseInt(hex.slice(1),16); let r=(n>>16)&255,g=(n>>8)&255,b=n&255;
    r=Math.max(0,Math.min(255,r+amt));g=Math.max(0,Math.min(255,g+amt));b=Math.max(0,Math.min(255,b+amt));
    return `#${((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1)}`; }catch{ return hex; }
}
function buildPixelGrid(shape){
  const N=24; const g=Array.from({length:N},()=>Array(N).fill('.'));
  const cx=12; let rx,ry,cy;
  if(shape==="wide"){rx=10;ry=6.5;cy=14;}
  else if(shape==="tall"){rx=6.5;ry=9.5;cy=12;}
  else if(shape==="sharp"){rx=8;ry=8;cy=12;}
  else {rx=8;ry=8;cy=13;}
  const lx=-0.62, ly=-0.72;
  for(let y=0;y<N;y++)for(let x=0;x<N;x++){
    const nx=(x-cx+0.5)/rx, ny=(y-cy)/ry;
    if(nx*nx+ny*ny<=1){
      const v=-(nx*lx+ny*ly)+(1-(nx*nx+ny*ny))*0.25;
      g[y][x]= v>0.62?'B': v>0.28?'h': v>-0.18?'b': v>-0.55?'d':'k';
    }
  }
  for(let y=0;y<N;y++)for(let x=0;x<N;x++){
    if(g[y][x]==='.'||g[y][x]==='o')continue;
    const nx=(x-cx+0.5)/(rx*0.55), ny=(y-(cy+ry*0.35))/(ry*0.5);
    if(nx*nx+ny*ny<=1) g[y][x]= (y<cy+ry*0.35)?'A':'a';
  }
  const setB=(x,y,c='b')=>{ x=Math.round(x); y=Math.round(y); if(y>=0&&y<N&&x>=0&&x<N) g[y][x]=c; };
  if(shape==="sharp"){ [[cx-5,4],[cx,2],[cx+4,4]].forEach(([x,ty])=>{ for(let y=ty;y<cy-ry+2;y++){ setB(x,y,'d'); setB(x+1,y,'b'); } }); }
  else if(shape==="tall"){ for(let y=2;y<cy-ry+2;y++){ setB(cx,y,'a'); setB(cx-1,y+1,'A'); setB(cx+1,y+1,'a'); } }
  else if(shape==="round"){ [[cx-rx+2,cy-ry-1],[cx+rx-3,cy-ry-1]].forEach(([x,y])=>{ setB(x,y,'b'); setB(x,y+1,'d'); setB(x+1,y,'b'); }); }
  else if(shape==="wide"){ setB(cx,cy-ry-2,'a'); setB(cx,cy-ry-1,'d'); setB(cx-1,cy-ry-3,'A'); setB(cx,cy-ry-3,'a'); setB(cx+1,cy-ry-3,'a'); }
  const ey=cy-3;
  [[cx-5],[cx+3]].forEach(([ex])=>{
    for(let dy=0;dy<3;dy++)for(let dx=0;dx<3;dx++){ if(g[ey+dy]&&g[ey+dy][ex+dx]&&g[ey+dy][ex+dx]!=='.') g[ey+dy][ex+dx]='w'; }
    if(g[ey+1]){ g[ey+1][ex+1]='e'; if(g[ey+2])g[ey+2][ex+1]='e'; }
    if(g[ey])g[ey][ex+1]='W';
  });
  setB(cx-6,cy,'A'); setB(cx+5,cy,'A');
  if(g[cy+1]){ g[cy+1][cx-1]='k'; g[cy+1][cx]='k'; g[cy+1][cx+1]='k'; }
  const fy=cy+ry-1; [cx-rx+3,cx+rx-4].forEach(fx=>{ setB(fx,fy,'d'); setB(fx,fy+1,'k'); setB(fx+1,fy,'d'); setB(fx+1,fy+1,'k'); });
  const isBody=c=>c&&c!=='.'&&c!=='o';
  const base=g.map(r=>r.slice());
  for(let y=0;y<N;y++)for(let x=0;x<N;x++){
    if(base[y][x]==='.'){
      const nb=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]].some(([dx,dy])=>{const ny=y+dy,nx=x+dx;return ny>=0&&ny<N&&nx>=0&&nx<N&&isBody(base[ny][nx]);});
      if(nb)g[y][x]='o';
    }
  }
  return g;
}
const PIXEL_CACHE={};
function getGrid(shape){ if(!PIXEL_CACHE[shape])PIXEL_CACHE[shape]=buildPixelGrid(shape); return PIXEL_CACHE[shape]; }

function MonsterSprite({mon,size=64,animate=false,hit=false,flip=false}){
  const wrap=(inner)=>(
    <div style={{display:"inline-block",animation:hit?"jShake 0.3s":animate?"jBounce 0.6s ease-in-out infinite alternate":"none",filter:hit?"brightness(1.7)":"none",transition:"filter 0.1s",transform:flip?"scaleX(-1)":"none"}}>
      <style>{`@keyframes jBounce{from{transform:translateY(0)}to{transform:translateY(-3px)}}@keyframes jShake{0%{transform:translateX(0)}25%{transform:translateX(4px)}75%{transform:translateX(-4px)}100%{transform:translateX(0)}}`}</style>
      {inner}
    </div>
  );

  // 画像が登録されていれば それを表示
  const img=SPRITE_IMAGES[mon.speciesId];
  if(img){
    return wrap(
      <img src={img} alt={mon.name} width={size} height={size}
        style={{imageRendering:"pixelated",objectFit:"contain",display:"block"}}/>
    );
  }

  // 未登録なら 自動ドット絵にフォールバック
  const a=mon.appearance||SPECIES[mon.speciesId].appearance;
  const bc=a.bodyColor||"#B4B2A9",ec=a.eyeColor||"#2C2C2A",ac=a.accent||"#ffffff";
  const shape=a.shape||"round";
  const grid=getGrid(shape); const N=grid.length; const cell=size/N;
  const pal={ o:shade(ec,-25), k:shade(bc,-70), d:shade(bc,-38), b:bc, h:shade(bc,34), B:shade(bc,62), a:ac, A:shade(ac,40), e:ec, w:"#ffffff", W:"#ffffff" };
  const rects=[];
  for(let y=0;y<N;y++)for(let x=0;x<N;x++){ const c=grid[y][x]; if(c==='.')continue;
    rects.push(<rect key={`${x}-${y}`} x={x*cell} y={y*cell} width={cell+0.6} height={cell+0.6} fill={pal[c]||bc}/>); }
  return wrap(
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} shapeRendering="crispEdges" style={{overflow:"visible",display:"block"}}>
      <ellipse cx={size/2} cy={size*0.97} rx={size*0.32} ry={size*0.045} fill="#00000022"/>
      {rects}
    </svg>
  );
}

function playBGM(scene){}
function playSE(name){}

const TILE_COLOR={".":"#C7E29E","T":"#C7E29E","#":"#8C8A82","~":"#7FB5E6",",":"#E4D2A8",'"':"#9ECE6A","F":"#E8E0D0","C":"#D8C0E0","K":"#B5895E","D":"#7A5230","S":"#C7E29E","B":".","R":"#B5654A","W":"#9AA0A6","E":"#5A4030","M":"#6E6660"};
const BLOCK=new Set(["T","#","~","K","R","W","S"]);
const ENCOUNTER_TILE='"';

const MAPS={
  town:{ name:"リライルの街", bgm:"town",
    grid:["TTTTTTTTTTTTTT","T....,....RRR.T","T.RRR,....RDR.T","T.RDR,......,.T","T...,,,,,,,,,.T","T.RR,.S...RRR.T","T.RD,.....RDR.T","T...,.....,..T","T.,,,,,,,,,,.T","T.,.....B..,.T","TTTTTTT,TTTTTTT"],
    warps:[{x:7,y:10,to:"route1",tx:7,ty:1},{x:3,y:3,to:"center",tx:4,ty:6},{x:3,y:6,to:"shop",tx:4,ty:6},{x:11,y:2,to:"gym",tx:4,ty:8},{x:11,y:6,to:"home",tx:3,ty:5}],
    npcs:[{x:6,y:7,color:"#C0392B",lines:["ようこそ リライルの街へ！","北へ行くと いろんなクライアントが いるよ。"]},{x:9,y:4,color:"#2E8B57",lines:["みずタイプ（資金繰り）には ほのお（成長企業）が つよいんだ。"]}],
    signs:{"5,5":["リライルの街","→ジム ←回復所/ショップ"]}, chests:{"7,9":{item:"キズぐすり"}}, encounter:null },
  route1:{ name:"1番道路", bgm:"field",
    grid:["TTTTTTT,TTTTTTT","T.....,,,.....T",'T."""..,..""".T','T."""..,..""".T',"T.,,,,,,,,,,..T",'T.""..,...""..T','T.""..,...""..T',"T.....,......T","T..S..,...B..T","T.....,......T","TTTTTT,TTT,TTTT"],
    warps:[{x:6,y:0,to:"town",tx:7,ty:9},{x:6,y:10,to:"cave",tx:4,ty:9},{x:9,y:10,to:"castle_gate",tx:6,ty:10}],
    npcs:[{x:7,y:5,color:"#8E44AD",trainer:true,defeated:false,mon:{species:"tairyo",level:8},lines:["新人税理士だ！ じっせん しようぜ！"],afterLines:["つよいな…！ 洞窟の主に きをつけて。"]}],
    signs:{"3,8":["1番道路","北:街 南:洞窟・城"]}, chests:{"10,8":{item:"モンスターボール"}},
    encounter:{rate:0.22,pool:["routinen","genkin","koyume","satori"],lv:[3,7]} },
  cave:{ name:"こじれの洞窟", bgm:"cave",
    grid:["##############","#MM........MM#",'#M"".,,,."".M#','#M"".,M,."".M#',"#...,,M,,...#",'#""..,M,..""#','#""..,,,..""#',"#M..,,,,,..M#",'#MM..,B,..MM#',"#####,D,#####","##############"],
    warps:[{x:5,y:9,to:"route1",tx:6,ty:9},{x:6,y:9,to:"route1",tx:6,ty:9}],
    npcs:[{x:6,y:4,color:"#34495E",trainer:true,defeated:false,mon:{species:"grayzone",level:11},lines:["洞窟の ぬしだ。論点を さばけるか？"],afterLines:["みごと…！ 先へ すすむがいい。"]}],
    signs:{}, chests:{"6,8":{item:"げんきのかけら"}},
    encounter:{rate:0.3,pool:["jirihin","miuchi","grayzone"],lv:[6,11]} },
  castle_gate:{ name:"本社ビル前", bgm:"field",
    grid:["TTTTWWWWWWTTTTT","T...W....W...T","T...W.EE.W...T","T...WWWWWW...T","T.,,,,,,,,,..T","T.,.......,..T","T.S.......,..T","T.,.......,..T","T.,,,,,,,,,..T","T.....,......T","TTTTTT,TTTTTTT"],
    warps:[{x:6,y:10,to:"route1",tx:9,ty:9},{x:5,y:2,to:"castle",tx:6,ty:9},{x:6,y:2,to:"castle",tx:6,ty:9}],
    npcs:[{x:8,y:5,color:"#2C3E50",lines:["この先は ドラそうけん本社。","巨大法人の王が まっている。"]}],
    signs:{"2,6":["ドラそうけん本社","王の間へ つづく"]}, chests:{}, encounter:null },
  castle:{ name:"ドラそうけん本社", bgm:"castle",
    grid:["##########","#FFFFFFFF#","#FFCCCCFF#","#FFCCCCFF#","#FFCCCCFF#","#FFFFFFFF#","#FF.FF.FF#","#FFFFFFFF#","####DD####","##########"],
    warps:[{x:4,y:8,to:"castle_gate",tx:5,ty:2},{x:5,y:8,to:"castle_gate",tx:5,ty:2}],
    npcs:[{x:4,y:2,color:"#4A4AA8",king:true,trainer:true,defeated:false,mon:{species:"doragon",level:18},lines:["よくぞ ここまで…","当社の すべての論点、さばけるかな？"],afterLines:["みごと。きみは リライルの英雄だ！"]},{x:2,y:6,color:"#7F8C8D",lines:["王は ドラゴンタイプ。フェアリーや こおりが 有効だ。"]},{x:7,y:6,color:"#7F8C8D",lines:["あらゆる論点を 内包する 大型法人だ…"]}],
    signs:{}, chests:{}, encounter:null },
  center:{ name:"回復所", bgm:"indoor",
    grid:["########","#FFFFFF#","#FKKKKF#","#F....F#","#F....F#","#F....F#","#FF..FF#","###DD###"],
    warps:[{x:3,y:7,to:"town",tx:3,ty:4},{x:4,y:7,to:"town",tx:3,ty:4}],
    npcs:[{x:3,y:2,color:"#E74C3C",healer:true,lines:["いらっしゃい。担当を 立て直しますね！"]}], signs:{}, chests:{}, encounter:null },
  shop:{ name:"ショップ", bgm:"indoor",
    grid:["########","#FFFFFF#","#FKKKKF#","#F....F#","#F....F#","#F....F#","#FF..FF#","###DD###"],
    warps:[{x:3,y:7,to:"town",tx:3,ty:7},{x:4,y:7,to:"town",tx:3,ty:7}],
    npcs:[{x:3,y:2,color:"#2980B9",shop:true,lines:["契約書（モンスターボール）いかが？"]}], signs:{}, chests:{}, encounter:null },
  gym:{ name:"はがねジム", bgm:"gym",
    grid:["##########","#FFFFFFFF#","#FFCCCCFF#","#FFCCCCFF#","#FFCCCCFF#","#FFCCCCFF#","#FF.FF.FF#","#FFFFFFFF#","####DD####","##########"],
    warps:[{x:4,y:8,to:"town",tx:11,ty:3},{x:5,y:8,to:"town",tx:11,ty:3}],
    npcs:[{x:4,y:2,color:"#E67E22",gym:true,trainer:true,defeated:false,mon:{species:"teppeki",level:12},lines:["わたしが ジムリーダー。","盤石の財務、くずせるかな？"],afterLines:["…まいった！ バッジを さずけよう。"]},{x:7,y:5,color:"#95A5A6",lines:["リーダーは はがね。ほのお や じめん が 有効。"]}],
    signs:{}, chests:{}, encounter:null },
  home:{ name:"じぶんの事務所", bgm:"indoor",
    grid:["########","#FFFFFF#","#F.KK.F#","#F....F#","#FCC..F#","#FCC..F#","#FF..FF#","###DD###"],
    warps:[{x:3,y:7,to:"town",tx:11,ty:6},{x:4,y:7,to:"town",tx:11,ty:6}],
    npcs:[{x:2,y:2,color:"#16A085",lines:["おかえり。きょうも 顧問先 まわろう！"]}], signs:{}, chests:{}, encounter:null },
};
const TILE=34;

function Tile({ch,x,y}){
  const px=x*TILE,py=y*TILE; const base=TILE_COLOR[ch]||"#C7E29E";
  return (<g>
    <rect x={px} y={py} width={TILE} height={TILE} fill={ch==="B"?TILE_COLOR["."]:base}/>
    {ch==="T"&&<><circle cx={px+TILE/2} cy={py+TILE*0.42} r={TILE*0.34} fill="#3E6B28"/><rect x={px+TILE*0.44} y={py+TILE*0.6} width={TILE*0.12} height={TILE*0.3} fill="#7A5230"/></>}
    {ch==='"'&&<g opacity="0.6"><path d={`M${px+7} ${py+TILE-5} q3 -10 0 -14`} stroke="#4E7A2A" strokeWidth="2" fill="none"/><path d={`M${px+TILE/2} ${py+TILE-5} q3 -12 0 -16`} stroke="#4E7A2A" strokeWidth="2" fill="none"/><path d={`M${px+TILE-9} ${py+TILE-5} q3 -10 0 -14`} stroke="#4E7A2A" strokeWidth="2" fill="none"/></g>}
    {ch==="~"&&<path d={`M${px+5} ${py+TILE*0.5} q5 -3 10 0 t10 0`} stroke="#5B97D1" strokeWidth="2" fill="none" opacity="0.6"/>}
    {ch==="R"&&<><rect x={px} y={py} width={TILE} height={TILE} fill="#B5654A"/><line x1={px} y1={py+TILE*0.5} x2={px+TILE} y2={py+TILE*0.5} stroke="#933F2C" strokeWidth="1.5"/></>}
    {ch==="W"&&<><rect x={px} y={py} width={TILE} height={TILE} fill="#9AA0A6"/><rect x={px+2} y={py+2} width={TILE-4} height={TILE*0.42} fill="#AEB4BA"/></>}
    {ch==="D"&&<><rect x={px+TILE*0.18} y={py+TILE*0.1} width={TILE*0.64} height={TILE*0.9} rx={3} fill="#5A3A1E"/><circle cx={px+TILE*0.68} cy={py+TILE*0.55} r={2} fill="#E8C547"/></>}
    {ch==="E"&&<rect x={px} y={py+TILE*0.15} width={TILE} height={TILE*0.85} fill="#3A2818"/>}
    {ch==="#"&&<rect x={px} y={py} width={TILE} height={TILE} fill="#8C8A82" stroke="#6E6C64" strokeWidth="1"/>}
    {ch==="K"&&<><rect x={px} y={py+TILE*0.3} width={TILE} height={TILE*0.7} fill="#B5895E"/><rect x={px} y={py+TILE*0.3} width={TILE} height={4} fill="#946C42"/></>}
    {ch==="S"&&<><rect x={px+TILE*0.46} y={py+TILE*0.4} width={TILE*0.08} height={TILE*0.5} fill="#7A5230"/><rect x={px+TILE*0.2} y={py+TILE*0.15} width={TILE*0.6} height={TILE*0.32} rx={2} fill="#C9A268" stroke="#7A5230" strokeWidth="1"/></>}
    {ch==="B"&&<><rect x={px+TILE*0.22} y={py+TILE*0.38} width={TILE*0.56} height={TILE*0.4} rx={2} fill="#C9982E"/><rect x={px+TILE*0.22} y={py+TILE*0.34} width={TILE*0.56} height={TILE*0.12} rx={2} fill="#E8C547"/><rect x={px+TILE*0.46} y={py+TILE*0.34} width={TILE*0.08} height={TILE*0.44} fill="#7A5230"/></>}
  </g>);
}
function PlayerAvatar({facing,size=28}){const s=size,cx=s/2;const eo=facing==="left"?-s*0.07:facing==="right"?s*0.07:0;return (<svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}><ellipse cx={cx} cy={s*0.92} rx={s*0.22} ry={s*0.05} fill="#00000022"/><rect x={cx-s*0.16} y={s*0.5} width={s*0.32} height={s*0.34} rx={s*0.06} fill="#3457A8"/><circle cx={cx} cy={s*0.34} r={s*0.2} fill="#F2D2A9"/><path d={`M${cx-s*0.22} ${s*0.32} a${s*0.22} ${s*0.22} 0 0 1 ${s*0.44} 0 l0 ${-s*0.04} a${s*0.22} ${s*0.18} 0 0 0 ${-s*0.44} 0 z`} fill="#C0392B"/><rect x={cx-s*0.24} y={s*0.26} width={s*0.48} height={s*0.07} rx={s*0.03} fill="#C0392B"/>{facing!=="up"&&<><circle cx={cx-s*0.07+eo} cy={s*0.36} r={s*0.03} fill="#2C2C2A"/><circle cx={cx+s*0.07+eo} cy={s*0.36} r={s*0.03} fill="#2C2C2A"/></>}</svg>);}
function NpcAvatar({color,size=28,king,gym}){const s=size,cx=s/2;return (<svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}><ellipse cx={cx} cy={s*0.92} rx={s*0.22} ry={s*0.05} fill="#00000022"/><rect x={cx-s*0.16} y={s*0.5} width={s*0.32} height={s*0.34} rx={s*0.06} fill={color}/><circle cx={cx} cy={s*0.34} r={s*0.2} fill="#F2D2A9"/>{king?<path d={`M${cx-s*0.2} ${s*0.2} l${s*0.1} ${-s*0.12} l${s*0.1} ${s*0.08} l${s*0.1} ${-s*0.08} l${s*0.1} ${s*0.12} z`} fill="#E8C547"/>:<path d={`M${cx-s*0.22} ${s*0.3} a${s*0.22} ${s*0.22} 0 0 1 ${s*0.44} 0 z`} fill={gym?"#222":"#5A3A2A"}/>}<circle cx={cx-s*0.07} cy={s*0.36} r={s*0.03} fill="#2C2C2A"/><circle cx={cx+s*0.07} cy={s*0.36} r={s*0.03} fill="#2C2C2A"/></svg>);}

function HpBar({cur,max}){const pct=Math.max(0,Math.min(100,Math.round(cur/max*100)));const c=pct>50?"#1D9E75":pct>20?"#BA7517":"#E24B4A";return (<div style={{flex:1,height:7,background:"var(--color-background-secondary)",borderRadius:4,overflow:"hidden"}}><div style={{width:`${pct}%`,height:"100%",background:c,borderRadius:4,transition:"width 0.4s"}}/></div>);}
function StatBar({val,color}){const pct=Math.min(100,Math.round(val/180*100));return (<div style={{flex:1,height:7,background:"var(--color-background-secondary)",borderRadius:4,overflow:"hidden"}}><div style={{width:`${pct}%`,height:"100%",background:color,borderRadius:4}}/></div>);}
function ExpBar({cur,max}){const pct=Math.max(0,Math.min(100,Math.round(cur/max*100)));return (<div style={{width:"100%",height:4,background:"var(--color-background-secondary)",borderRadius:4,overflow:"hidden"}}><div style={{width:`${pct}%`,height:"100%",background:"#378ADD",borderRadius:4,transition:"width 0.4s"}}/></div>);}
function TypeBadge({type}){if(!type)return null;const t=TYPE_INFO[type]||{color:"#888",bg:"#eee",border:"#ccc"};return (<span style={{fontSize:10,padding:"1px 7px",borderRadius:10,background:t.bg,color:t.color,fontWeight:500,border:`1px solid ${t.border}`}}>{type}</span>);}
function AbilityBadge({ability}){if(!ability)return null;const info=ABILITIES[ability]||{good:true};const col=info.good?"#1D9E75":"#C0563A";return (<span style={{fontSize:10,padding:"1px 7px",borderRadius:10,background:info.good?"#E7F4EE":"#FBEBE6",color:col,fontWeight:500,border:`1px solid ${col}55`}}>{info.good?"◎":"△"}{ability}</span>);}

function FieldScene({mapId,mapState,pos,facing,onMove,onAction,onOpenParty}){
  const map=MAPS[mapId]; const grid=map.grid; const W=grid[0].length*TILE,H=grid.length*TILE;
  const ref=useRef(null);
  useEffect(()=>{ref.current?.focus();playBGM(map.bgm);},[mapId]);
  useEffect(()=>{const onKey=e=>{if(["ArrowUp","w","W"].includes(e.key)){e.preventDefault();onMove(0,-1,"up");}else if(["ArrowDown","s","S"].includes(e.key)){e.preventDefault();onMove(0,1,"down");}else if(["ArrowLeft","a","A"].includes(e.key)){e.preventDefault();onMove(-1,0,"left");}else if(["ArrowRight","d","D"].includes(e.key)){e.preventDefault();onMove(1,0,"right");}else if([" ","Enter","z","Z"].includes(e.key)){e.preventDefault();onAction();}};const el=ref.current;el?.addEventListener("keydown",onKey);return ()=>el?.removeEventListener("keydown",onKey);},[onMove,onAction]);
  const npcs=mapState.npcs; const chests=mapState.chests||{};
  return (
    <div style={{display:"flex",flexDirection:"column",gap:10,alignItems:"center"}}>
      <div style={{fontSize:13,fontWeight:500}}>{map.name}</div>
      <div ref={ref} tabIndex={0} style={{position:"relative",width:W,height:H,borderRadius:"var(--border-radius-lg)",overflow:"hidden",border:"2px solid var(--color-border-secondary)",outline:"none",maxWidth:"100%"}}>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{display:"block"}}>
          {grid.map((row,y)=>[...row].map((ch,x)=>{const key=`${x},${y}`;const drawn=(ch==="B"&&chests[key]?.got)?".":ch;return <Tile key={key} ch={drawn} x={x} y={y}/>;}))}
        </svg>
        {npcs.map((n,i)=>(!(n.trainer&&!n.king&&!n.gym&&n.defeated))&&(
          <div key={i} style={{position:"absolute",left:n.x*TILE+3,top:n.y*TILE+3,width:TILE-6,height:TILE-6,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <NpcAvatar color={n.color} size={TILE-8} king={n.king} gym={n.gym}/>
          </div>
        ))}
        <div style={{position:"absolute",left:pos.x*TILE+3,top:pos.y*TILE+3,width:TILE-6,height:TILE-6,transition:"left 0.1s,top 0.1s",display:"flex",alignItems:"center",justifyContent:"center"}}>
          <PlayerAvatar facing={facing} size={TILE-8}/>
        </div>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:18}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,38px)",gridTemplateRows:"repeat(3,38px)",gap:3}}>
          <div/><button onClick={()=>{ref.current?.focus();onMove(0,-1,"up");}} style={dpad}>↑</button><div/>
          <button onClick={()=>{ref.current?.focus();onMove(-1,0,"left");}} style={dpad}>←</button>
          <button onClick={()=>{ref.current?.focus();onAction();}} style={{...dpad,fontSize:11,background:"var(--color-background-info)",color:"var(--color-text-info)"}}>調べる</button>
          <button onClick={()=>{ref.current?.focus();onMove(1,0,"right");}} style={dpad}>→</button>
          <div/><button onClick={()=>{ref.current?.focus();onMove(0,1,"down");}} style={dpad}>↓</button><div/>
        </div>
        <button onClick={onOpenParty} style={{fontSize:13,padding:"10px 16px",borderRadius:"var(--border-radius-md)"}}>顧問先</button>
      </div>
      <div style={{fontSize:11,color:"var(--color-text-secondary)",textAlign:"center"}}>矢印/WASD移動・スペースで調べる。</div>
    </div>
  );
}
const dpad={fontSize:15,borderRadius:"var(--border-radius-md)",border:"0.5px solid var(--color-border-tertiary)",background:"var(--color-background-primary)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"};

/* ===== バトル演出: タイプ別エフェクト ===== */
function AttackFX({mtype,kind}){
  const t=TYPE_INFO[mtype]||{color:"#888"};
  const n=kind==="spa"?14:8;
  const parts=Array.from({length:n},(_,i)=>{const a=(i/n)*Math.PI*2+Math.random()*0.5;const d=22+Math.random()*20;return {tx:Math.cos(a)*d,ty:Math.sin(a)*d,delay:Math.random()*0.08,r:kind==="spa"?2+Math.random()*3:2};});
  return (
    <div style={{position:"absolute",inset:0,pointerEvents:"none",overflow:"visible"}}>
      <div style={{position:"absolute",left:"50%",top:"50%",width:0,height:0}}>
        {kind==="spa"&&<div style={{position:"absolute",left:-26,top:-26,width:52,height:52,borderRadius:"50%",border:`4px solid ${t.color}`,animation:"fxRing 0.5s ease-out forwards"}}/>}
        {kind!=="spa"&&<div style={{position:"absolute",left:-22,top:-18,width:44,height:36,borderLeft:`5px solid ${t.color}`,borderTop:`5px solid ${t.color}`,transform:"skewX(-20deg)",animation:"fxSlash 0.4s ease-out forwards"}}/>}
        {parts.map((p,i)=><div key={i} style={{position:"absolute",left:-p.r,top:-p.r,width:p.r*2,height:p.r*2,borderRadius:"50%",background:t.color,"--tx":`${p.tx}px`,"--ty":`${p.ty}px`,animation:`fxFly 0.5s ${p.delay}s ease-out forwards`}}/>)}
      </div>
    </div>
  );
}

function BattleScene({playerMon,wild,isTrainer,trainerLabel,onEnd}){
  const pStats=stats(playerMon),wStats=stats(wild);
  const [pHp,setPHp]=useState(playerMon.curHp??pStats.maxHp);
  const [wHp,setWHp]=useState(wStats.maxHp);
  const [log,setLog]=useState([isTrainer?`${trainerLabel} が しょうぶを しかけてきた！`:`野生の ${wild.name} が あらわれた！`]);
  const [phase,setPhase]=useState("player");
  const [pHit,setPHit]=useState(false),[wHit,setWHit]=useState(false);
  const [end,setEnd]=useState(null);
  const [lunge,setLunge]=useState(null);
  const [fx,setFx]=useState(null);
  const [faint,setFaint]=useState(null);
  const [flash,setFlash]=useState(false);
  const [floatDmg,setFloatDmg]=useState(null);
  const [entered,setEntered]=useState(false);
  const logRef=useRef(null);
  useEffect(()=>{playBGM(isTrainer?"trainer":"battle");const t=setTimeout(()=>setEntered(true),50);return ()=>clearTimeout(t);},[]);
  useEffect(()=>{if(logRef.current)logRef.current.scrollTop=logRef.current.scrollHeight;},[log]);
  const addLog=m=>setLog(l=>[...l,m]);
  const dmgCalc=(mv,a,d,def)=>{const at=mv.type==="spa"?a.spa:a.atk;const df=mv.type==="spa"?d.spd:d.def;const mult=typeMultiplier(mv.mtype,def);const raw=Math.max(1,Math.floor((mv.power*at/df)*0.5+Math.random()*4+2));return {dmg:Math.max(1,Math.floor(raw*mult)),mult};};

  const enemyTurn=(curP)=>{
    setTimeout(()=>{
      const mv=wild.moves[Math.floor(Math.random()*wild.moves.length)];
      setLunge("enemy"); setTimeout(()=>setLunge(null),260);
      setTimeout(()=>{
        const{dmg,mult}=dmgCalc(mv,wStats,pStats,playerMon);
        playSE("hit"); setFx({mtype:mv.mtype,kind:mv.type,target:"player"}); setTimeout(()=>setFx(null),520);
        setPHit(true);setTimeout(()=>setPHit(false),320);
        if(mult>1.5){setFlash(true);setTimeout(()=>setFlash(false),220);}
        setFloatDmg({target:"player",dmg,mult}); setTimeout(()=>setFloatDmg(null),780);
        const nh=curP-dmg; setPHp(nh);
        addLog(`相手の ${wild.name} の ${mv.name}！ ${dmg}`);
        const el=effLabel(mult); if(el)addLog(el);
        if(nh<=0){ setFaint("player"); addLog(`${playerMon.name} は たおれた…`); setTimeout(()=>{setPhase("end");setEnd("lose");},800); }
        else setPhase("player");
      },220);
    },650);
  };

  const useMove=mv=>{
    if(phase!=="player")return; setPhase("anim");
    if(playerMon.ability==="なまけ" && Math.random()<0.25){ addLog(`${playerMon.name} は 資料を まだ出していない…（なまけ）`); setPhase("enemy"); enemyTurn(pHp); return; }
    setLunge("player"); setTimeout(()=>setLunge(null),260);
    setTimeout(()=>{
      const{dmg,mult}=dmgCalc(mv,pStats,wStats,wild);
      playSE("hit"); setFx({mtype:mv.mtype,kind:mv.type,target:"enemy"}); setTimeout(()=>setFx(null),520);
      setWHit(true);setTimeout(()=>setWHit(false),320);
      if(mult>1.5){setFlash(true);setTimeout(()=>setFlash(false),220);}
      setFloatDmg({target:"enemy",dmg,mult}); setTimeout(()=>setFloatDmg(null),780);
      const nh=wHp-dmg; setWHp(nh);
      addLog(`${playerMon.name} の ${mv.name}！ ${dmg}`);
      const el=effLabel(mult); if(el)addLog(el);
      if(nh<=0){ setFaint("enemy"); addLog(isTrainer?`${trainerLabel} に かった！`:`${wild.name} を なっとくさせた！`); setTimeout(()=>{setPhase("end");setEnd("win");},800); return; }
      let curP=pHp;
      if(playerMon.ability==="きんべん"){ const heal=Math.round(pStats.maxHp*0.06); curP=Math.min(pStats.maxHp,pHp+heal); setPHp(curP); addLog(`きんべん！ ${playerMon.name} の HPが ${heal} かいふく`); }
      setPhase("enemy"); enemyTurn(curP);
    },230);
  };
  const tryCapture=()=>{if(phase!=="player")return;setPhase("anim");const ok=Math.random()<(1-wHp/wStats.maxHp)*0.7+0.15;addLog(ok?`${wild.name} と 顧問契約をむすんだ！`:`${wild.name} は けいやくを ことわった…`);if(ok){setPhase("end");setEnd("capture");return;}setPhase("enemy");enemyTurn(pHp);};
  const bg=TYPE_INFO[wild.type1]?.bg||"#EAF3DE";

  const enemyWrap={position:"absolute",top:50,right:24,width:84,height:84,transition:"transform 0.13s ease, opacity 0.5s ease",transform: faint==="enemy"?"translateY(46px) scale(0.85)": lunge==="enemy"?"translate(-20px,16px)": entered?"none":"translate(46px,0)", opacity: faint==="enemy"?0: entered?1:0};
  const playerWrap={position:"absolute",bottom:14,left:24,width:92,height:92,transition:"transform 0.13s ease, opacity 0.5s ease",transform: faint==="player"?"translateY(50px) scale(0.85)": lunge==="player"?"translate(22px,-18px)": entered?"none":"translate(-46px,0)", opacity: faint==="player"?0: entered?1:0};

  return (
    <div style={{display:"flex",flexDirection:"column",gap:12,maxWidth:480,margin:"0 auto"}}>
      <style>{`
        @keyframes fxFly{0%{transform:translate(0,0) scale(1);opacity:1}100%{transform:translate(var(--tx),var(--ty)) scale(0.2);opacity:0}}
        @keyframes fxRing{0%{transform:scale(0.2);opacity:0.95}100%{transform:scale(1.9);opacity:0}}
        @keyframes fxSlash{0%{transform:skewX(-20deg) scale(0.4) rotate(-25deg);opacity:0}30%{opacity:1}100%{transform:skewX(-20deg) scale(1.4) rotate(18deg);opacity:0}}
        @keyframes fxFlash{0%{opacity:0}40%{opacity:0.7}100%{opacity:0}}
        @keyframes fxFloat{0%{opacity:1;transform:translateX(-50%) translateY(0)}100%{opacity:0;transform:translateX(-50%) translateY(-26px)}}
      `}</style>
      <div style={{borderRadius:"var(--border-radius-lg)",border:"0.5px solid var(--color-border-tertiary)",overflow:"hidden"}}>
        <div style={{background:bg,padding:"14px 18px",position:"relative",minHeight:184}}>
          {flash&&<div style={{position:"absolute",inset:0,background:"#fff",pointerEvents:"none",zIndex:5,animation:"fxFlash 0.22s ease-out forwards"}}/>}
          <div style={{position:"absolute",top:12,left:12,background:"var(--color-background-primary)",borderRadius:"var(--border-radius-md)",padding:"6px 10px",minWidth:150,border:"0.5px solid var(--color-border-tertiary)",zIndex:6}}>
            <div style={{display:"flex",gap:5,alignItems:"center",marginBottom:3,flexWrap:"wrap"}}><span style={{fontWeight:500,fontSize:13}}>{wild.name}</span><span style={{fontSize:11,color:"var(--color-text-secondary)"}}>Lv.{wild.level}</span><TypeBadge type={wild.type1}/><TypeBadge type={wild.type2}/></div>
            <HpBar cur={wHp} max={wStats.maxHp}/>
          </div>
          <div style={enemyWrap}>
            <MonsterSprite mon={wild} size={84} animate={phase==="player"&&!faint} hit={wHit}/>
            {fx?.target==="enemy"&&<AttackFX mtype={fx.mtype} kind={fx.kind}/>}
            {floatDmg?.target==="enemy"&&<div style={{position:"absolute",left:"50%",top:-6,fontWeight:700,fontSize:18,color:floatDmg.mult>1.5?"#E24B4A":"#444",textShadow:"0 1px 2px #fff",animation:"fxFloat 0.78s ease-out forwards",zIndex:7}}>{floatDmg.dmg}{floatDmg.mult>1.5?"!":""}</div>}
          </div>
          <div style={playerWrap}>
            <MonsterSprite mon={playerMon} size={92} animate={phase==="player"&&!faint} hit={pHit} flip/>
            {fx?.target==="player"&&<AttackFX mtype={fx.mtype} kind={fx.kind}/>}
            {floatDmg?.target==="player"&&<div style={{position:"absolute",left:"50%",top:-6,fontWeight:700,fontSize:18,color:floatDmg.mult>1.5?"#E24B4A":"#444",textShadow:"0 1px 2px #fff",animation:"fxFloat 0.78s ease-out forwards",zIndex:7}}>{floatDmg.dmg}{floatDmg.mult>1.5?"!":""}</div>}
          </div>
          <div style={{position:"absolute",bottom:12,right:12,background:"var(--color-background-primary)",borderRadius:"var(--border-radius-md)",padding:"6px 10px",minWidth:150,border:"0.5px solid var(--color-border-tertiary)",zIndex:6}}>
            <div style={{display:"flex",gap:5,alignItems:"center",marginBottom:3,flexWrap:"wrap"}}><span style={{fontWeight:500,fontSize:13}}>{playerMon.name}</span><span style={{fontSize:11,color:"var(--color-text-secondary)"}}>Lv.{playerMon.level}</span></div>
            <div style={{marginBottom:3}}><AbilityBadge ability={playerMon.ability}/></div>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}><HpBar cur={pHp} max={pStats.maxHp}/><span style={{fontSize:10,color:"var(--color-text-secondary)",minWidth:46}}>{Math.max(0,pHp)}/{pStats.maxHp}</span></div>
            <ExpBar cur={playerMon.exp} max={expToNext(playerMon.level)}/>
          </div>
        </div>
        <div ref={logRef} style={{background:"var(--color-background-primary)",borderTop:"0.5px solid var(--color-border-tertiary)",padding:"8px 12px",height:60,overflowY:"auto",fontSize:13}}>
          {log.map((l,i)=><div key={i}>{l}</div>)}
        </div>
      </div>
      {phase==="player"&&(
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
            {playerMon.moves.map(mv=>{const adv=typeMultiplier(mv.mtype,wild);return (
              <button key={mv.name} onClick={()=>useMove(mv)} style={{fontSize:13,padding:"10px 8px",textAlign:"left",borderRadius:"var(--border-radius-md)"}}>
                <div style={{fontWeight:500,display:"flex",alignItems:"center",gap:5}}>{mv.name}<TypeBadge type={mv.mtype}/></div>
                <div style={{fontSize:10,color:"var(--color-text-secondary)"}}>威力{mv.power}/{mv.type==="spa"?"特殊":"物理"}{adv>1?" ▲有利":adv<1?" ▼不利":""}</div>
              </button>
            );})}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
            <button onClick={tryCapture} disabled={isTrainer} style={{fontSize:13,padding:"9px",borderRadius:"var(--border-radius-md)",background:isTrainer?"var(--color-background-secondary)":"var(--color-background-info)",color:isTrainer?"var(--color-text-disabled)":"var(--color-text-info)",opacity:isTrainer?0.5:1}}>顧問契約</button>
            <button onClick={()=>onEnd({result:"run",pHp})} disabled={isTrainer} style={{fontSize:13,padding:"9px",borderRadius:"var(--border-radius-md)",opacity:isTrainer?0.5:1}}>にげる</button>
          </div>
        </div>
      )}
      {(phase==="enemy"||phase==="anim")&&<div style={{textAlign:"center",fontSize:13,color:"var(--color-text-secondary)",padding:"8px"}}>…</div>}
      {phase==="end"&&<div style={{textAlign:"center",padding:"8px"}}><button onClick={()=>onEnd({result:end,wild,pHp})} style={{fontSize:13,padding:"9px 28px",borderRadius:"var(--border-radius-md)"}}>つづける</button></div>}
    </div>
  );
}

function PartyScene({party,onClose}){
  return (
    <div style={{maxWidth:480,margin:"0 auto"}}>
      <button onClick={onClose} style={{fontSize:13,marginBottom:12,padding:"4px 12px",borderRadius:"var(--border-radius-md)"}}>← フィールドに戻る</button>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {party.map(mon=>{const st=stats(mon);const sp=SPECIES[mon.speciesId];const nextEvo=sp.evolveAt?`Lv.${sp.evolveAt}で進化`:"最終形態";return (
          <div key={mon.uid} style={{display:"flex",gap:12,alignItems:"flex-start",padding:"12px 14px",borderRadius:"var(--border-radius-lg)",border:"0.5px solid var(--color-border-tertiary)",background:"var(--color-background-primary)"}}>
            <MonsterSprite mon={mon} size={56}/>
            <div style={{flex:1}}>
              <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:3,flexWrap:"wrap"}}><span style={{fontWeight:500,fontSize:14}}>{mon.name}</span><span style={{fontSize:12,color:"var(--color-text-secondary)"}}>Lv.{mon.level}</span><TypeBadge type={mon.type1}/><TypeBadge type={mon.type2}/></div>
              <div style={{marginBottom:5}}><AbilityBadge ability={mon.ability}/></div>
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}><span style={{fontSize:10,color:"var(--color-text-secondary)",minWidth:24}}>HP</span><HpBar cur={mon.curHp??st.maxHp} max={st.maxHp}/><span style={{fontSize:10,color:"var(--color-text-secondary)"}}>{mon.curHp??st.maxHp}/{st.maxHp}</span></div>
              {STAT_LABELS.slice(1).map(s=>(
                <div key={s.key} style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}>
                  <span style={{fontSize:9,color:"var(--color-text-secondary)",minWidth:48}}>{s.label}<span style={{opacity:0.6}}>·{s.sub}</span></span>
                  <StatBar val={st[s.key]} color="#378ADD"/>
                  <span style={{fontSize:10,color:"var(--color-text-secondary)",minWidth:22,textAlign:"right"}}>{st[s.key]}</span>
                </div>
              ))}
              <div style={{fontSize:10,color:"var(--color-text-secondary)",margin:"4px 0 3px"}}>わざ: {mon.moves.map(m=>m.name).join(" / ")}</div>
              <div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:9,color:"var(--color-text-secondary)"}}>{nextEvo}</span><ExpBar cur={mon.exp} max={expToNext(mon.level)}/></div>
            </div>
          </div>
        );})}
      </div>
    </div>
  );
}

export default function App(){
  const [party,setParty]=useState([ makeMonster("satori",6), makeMonster("koyume",5) ]);
  const [mapId,setMapId]=useState("town");
  const [pos,setPos]=useState({x:7,y:9});
  const [facing,setFacing]=useState("up");
  const [scene,setScene]=useState("field");
  const [battle,setBattle]=useState(null);
  const [dialog,setDialog]=useState(null);
  const [toast,setToast]=useState("");
  const [badges,setBadges]=useState([]);
  const [balls,setBalls]=useState(5);
  const [mapStates,setMapStates]=useState(()=>{const o={};Object.keys(MAPS).forEach(k=>{o[k]={npcs:MAPS[k].npcs.map(n=>({...n})),chests:{...(MAPS[k].chests||{})}};});return o;});

  const showToast=m=>{setToast(m);setTimeout(()=>setToast(""),2400);};
  const map=MAPS[mapId],ms=mapStates[mapId];
  const startDialog=(lines,onDone,portrait,speaker)=>setDialog({lines,idx:0,onDone,portrait,speaker});
  const tileAt=(x,y)=>{const g=map.grid;if(y<0||y>=g.length||x<0||x>=g[0].length)return "#";return g[y][x];};

  const handleMove=useCallback((dx,dy,dir)=>{
    if(dialog)return; setFacing(dir);
    setPos(prev=>{
      const nx=prev.x+dx,ny=prev.y+dy,ch=tileAt(nx,ny);
      if(BLOCK.has(ch))return prev;
      if(ms.npcs.find(n=>n.x===nx&&n.y===ny&&!(n.trainer&&!n.king&&!n.gym&&n.defeated)))return prev;
      const warp=map.warps.find(w=>w.x===nx&&w.y===ny);
      if(warp){setTimeout(()=>{setMapId(warp.to);setPos({x:warp.tx,y:warp.ty});},60);return prev;}
      if(ch===ENCOUNTER_TILE&&map.encounter&&Math.random()<map.encounter.rate){
        const sp=map.encounter.pool[Math.floor(Math.random()*map.encounter.pool.length)];const[lo,hi]=map.encounter.lv;const lv=lo+Math.floor(Math.random()*(hi-lo+1));
        setTimeout(()=>{setBattle({wild:makeMonster(sp,lv),isTrainer:false});setScene("battle");},120);
      }
      return {x:nx,y:ny};
    });
  },[dialog,mapId,ms]);

  const handleAction=useCallback(()=>{
    if(dialog){setDialog(d=>{if(d.idx+1<d.lines.length)return{...d,idx:d.idx+1};d.onDone&&d.onDone();return null;});return;}
    const d={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]}[facing];const fx=pos.x+d[0],fy=pos.y+d[1];
    const npc=ms.npcs.find(n=>n.x===fx&&n.y===fy);
    if(npc){
      const who=npc.portrait, sname=npc.speaker;
      if(npc.healer){startDialog(npc.lines,()=>{setParty(p=>p.map(m=>({...m,curHp:stats(m).maxHp})));showToast("顧問先が ぜんかい した！");},who,sname);return;}
      if(npc.shop){startDialog([...npc.lines,"契約書を 3つ もらった！(試供品)"],()=>setBalls(b=>b+3),who,sname);return;}
      if(npc.trainer&&!npc.defeated){const label=npc.king?"巨大法人の王":npc.gym?"ジムリーダー":"ライバル税理士";startDialog(npc.lines,()=>{setBattle({wild:makeMonster(npc.mon.species,npc.mon.level),isTrainer:true,trainerLabel:npc.speaker||label,enemyPortrait:npc.portrait,npcRef:{map:mapId,x:npc.x,y:npc.y}});setScene("battle");},who,sname||label);return;}
      startDialog(npc.trainer&&npc.defeated?(npc.afterLines||npc.lines):npc.lines,null,who,sname);return;
    }
    const sign=(map.signs||{})[`${fx},${fy}`];if(sign){startDialog(sign);return;}
    const ch=tileAt(fx,fy);
    if(ch==="B"){const key=`${fx},${fy}`,chest=ms.chests[key];if(chest&&!chest.got){setMapStates(s=>({...s,[mapId]:{...s[mapId],chests:{...s[mapId].chests,[key]:{...chest,got:true}}}}));if(chest.item==="モンスターボール")setBalls(b=>b+3);startDialog(["たからばこを あけた！",`${chest.item} を てにいれた！`]);}else startDialog(["からっぽだ。"]);return;}
  },[dialog,facing,pos,ms,mapId]);

  const gainExp=(amount)=>{
    setParty(prev=>{
      const next=[...prev]; let mon={...next[0]}; mon.exp+=amount;
      const events=[];
      while(mon.exp>=expToNext(mon.level)){
        mon.exp-=expToNext(mon.level); mon.level+=1;
        events.push(`${mon.name} は レベル ${mon.level} に あがった！`);
        const learned=SPECIES[mon.speciesId].learnset[mon.level];
        if(learned){const nm=moveObj(learned);if(!mon.moves.find(m=>m.name===nm.name)){mon.moves=[...mon.moves,nm].slice(-4);events.push(`${mon.name} は ${learned} を おぼえた！`);}}
        const sp=SPECIES[mon.speciesId];
        if(sp.evolveAt&&mon.level>=sp.evolveAt&&sp.evolveTo){
          const oldName=mon.name;const evo=SPECIES[sp.evolveTo];
          mon.speciesId=sp.evolveTo;mon.name=evo.name;mon.type1=evo.type1;mon.type2=evo.type2;mon.base={...evo.base};mon.appearance={...evo.appearance};mon.ability=evo.ability;
          const evoMove=evo.learnset[1];if(evoMove&&!mon.moves.find(m=>m.name===evoMove))mon.moves=[...mon.moves,moveObj(evoMove)].slice(-4);
          events.push(`おや…？ ${oldName} の ようすが…！`);events.push(`${oldName} は ${evo.name} に しんかした！`);
        }
        mon.curHp=stats(mon).maxHp;
      }
      next[0]=mon;
      if(events.length) setTimeout(()=>startDialog(events),350);
      return next;
    });
  };

  const handleBattleEnd=({result,wild,pHp})=>{
    if(pHp!=null) setParty(prev=>{const n=[...prev];n[0]={...n[0],curHp:Math.max(0,pHp)};return n;});
    if(result==="win"){
      const exp=(wild?wild.level:5)*6+10; showToast(`${exp} の けいけんち！`); gainExp(exp);
      if(battle?.isTrainer&&battle.npcRef){const{map:mk,x,y}=battle.npcRef;setMapStates(s=>({...s,[mk]:{...s[mk],npcs:s[mk].npcs.map(n=>n.x===x&&n.y===y?{...n,defeated:true}:n)}}));const npc=ms.npcs.find(n=>n.x===x&&n.y===y);if(npc?.gym&&!badges.includes(mapId)){setBadges(b=>[...b,mapId]);setTimeout(()=>showToast("ジムバッジを てにいれた！"),700);}if(npc?.afterLines)setTimeout(()=>startDialog(npc.afterLines),500);}
    }else if(result==="capture"){if(party.length<6&&wild){setParty(p=>[...p,makeMonster(wild.speciesId,wild.level)]);showToast(`${wild.name} と 契約した！`);}setBalls(b=>Math.max(0,b-1));}
    else if(result==="lose"){setParty(p=>p.map(m=>({...m,curHp:stats(m).maxHp})));showToast("全担当が ダウン…回復所で 立て直した。");setMapId("town");setPos({x:3,y:4});}
    setBattle(null);setScene("field");
  };

  const activeMon=party.find(m=>(m.curHp??stats(m).maxHp)>0)||party[0];

  return (
    <div style={{padding:"16px 0",fontFamily:"var(--font-sans)",position:"relative"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginBottom:4}}><span style={{fontSize:16,fontWeight:500}}>リライルクエスト</span><span style={{fontSize:11,color:"var(--color-text-secondary)"}}>v0.4</span></div>
      <div style={{display:"flex",justifyContent:"center",gap:14,fontSize:11,color:"var(--color-text-secondary)",marginBottom:14}}><span>🏅 バッジ {badges.length}</span><span>📄 契約書 {balls}</span><span>👥 顧問先 {party.length}</span></div>
      {scene==="field"&&<FieldScene mapId={mapId} mapState={ms} pos={pos} facing={facing} onMove={handleMove} onAction={handleAction} onOpenParty={()=>setScene("party")}/>}
      {scene==="battle"&&battle&&<BattleScene playerMon={activeMon} wild={battle.wild} isTrainer={battle.isTrainer} trainerLabel={battle.trainerLabel} enemyPortrait={battle.enemyPortrait} onEnd={handleBattleEnd}/>}
      {scene==="party"&&<PartyScene party={party} onClose={()=>setScene("field")}/>}
      {dialog&&(<div onClick={handleAction} style={{position:"fixed",inset:0,zIndex:40,display:"flex",alignItems:"flex-end",justifyContent:"center",padding:"0 0 28px"}}>
        <div style={{maxWidth:460,width:"92%",display:"flex",flexDirection:"column",alignItems:"flex-start"}}>
          {dialog.portrait&&NPC_IMAGES[dialog.portrait]&&(
            <img src={NPC_IMAGES[dialog.portrait]} alt={dialog.speaker||""} style={{height:160,imageRendering:"pixelated",objectFit:"contain",marginLeft:8,marginBottom:-6,filter:"drop-shadow(0 4px 8px rgba(0,0,0,0.25))"}}/>
          )}
          <div style={{background:"var(--color-background-primary)",border:"2px solid var(--color-border-secondary)",borderRadius:"var(--border-radius-lg)",padding:"14px 18px",width:"100%",boxShadow:"0 8px 30px rgba(0,0,0,0.25)",cursor:"pointer"}}>
            {dialog.speaker&&<div style={{fontSize:12,fontWeight:600,color:"var(--color-text-info)",marginBottom:4}}>{dialog.speaker}</div>}
            <div style={{fontSize:14,lineHeight:1.6}}>{dialog.lines[dialog.idx]}</div>
            <div style={{fontSize:11,color:"var(--color-text-secondary)",textAlign:"right",marginTop:8}}>▼ クリック/スペースで送る</div>
          </div>
        </div>
      </div>)}
      {toast&&<div style={{position:"fixed",bottom:24,left:"50%",transform:"translateX(-50%)",background:"var(--color-text-primary)",color:"var(--color-background-primary)",padding:"8px 18px",borderRadius:"var(--border-radius-lg)",fontSize:13,zIndex:50,boxShadow:"0 4px 16px rgba(0,0,0,0.2)"}}>{toast}</div>}
    </div>
  );
}
