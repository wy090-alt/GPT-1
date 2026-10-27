const $ = id => document.getElementById(id);
const canvas = $('game'), gameCtx = canvas.getContext('2d');
let ctx = gameCtx, hurtTimer = 0, galleryWasRunning = false, lastGalleryPaint = 0;
const H = 600, GROUND = 500, TAU = Math.PI * 2;
let W = 1152, state = 'menu', previousState = 'menu', level = 0, coins = 0, lives = 3, camera = 0, clock = 0, lastTime = 0;
let world, player, particles = [], floatTexts = [], checkpoint = 90, jumpBuffer = 0, coyote = 0, damageTimer = 0, toastTimer = 0, soundOn = false;
let best = 0;
try { best = Number(localStorage.getItem('puppy-adventure-best')) || 0; } catch {}
$('bestScore').textContent = String(best).padStart(2, '0');
const keys = {left:false,right:false};
const palettes = [
  {sky:'#edf3df',bottom:'#f7f5d9',far:'#dfe8c7',hill:'#d1dfb8',near:'#bbd09d',grass:'#a4c080',edge:'#829e61',soil:'#e9dfbf',dot:'#c4b893',leaf:'#afc997',cloud:'#fffef2',sun:'#f5df9b',outline:'#5c6d48'},
  {sky:'#f6e8de',bottom:'#fff0d9',far:'#edd8ca',hill:'#e3c6b5',near:'#cdbd9d',grass:'#c1bd85',edge:'#a39e68',soil:'#eddcc8',dot:'#c9b09d',leaf:'#d8b59d',cloud:'#fff9ec',sun:'#f1bd88',outline:'#7e6c53'},
  {sky:'#dcddec',bottom:'#ede5ef',far:'#c8cbdf',hill:'#b7c1d4',near:'#a6b8be',grass:'#a3b8a0',edge:'#7d998b',soil:'#d5d1d4',dot:'#b0a6b3',leaf:'#a7b8c9',cloud:'#f7f3f1',sun:'#fff3c5',outline:'#626b7b'}
];
const names=['第一站 · 阳光草地','第二站 · 落日晚霞','第三站 · 星光之约'];
const tips=['连续按两次跳跃，可以跳得更高哦。','从上面踩中蘑菇，就能轻巧地弹起来。','快到了！把最后一段星光带给小白吧。'];

function resize(){ const r=canvas.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2); canvas.width=Math.round(r.width*d);canvas.height=Math.round(r.height*d);W=r.width/r.height*H;ctx.setTransform(canvas.width/W,0,0,canvas.height/H,0,0); }
new ResizeObserver(resize).observe($('stage'));
function shape(path, fill, stroke='#5d654b', width=2){ctx.beginPath();path();if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.lineJoin='round';ctx.lineCap='round';ctx.stroke();}}
function ellipse(x,y,rx,ry,fill,stroke=null,width=2){shape(()=>ctx.ellipse(x,y,rx,ry,0,0,TAU),fill,stroke,width);}
function rect(x,y,w,h,r,fill,stroke=null,width=2){shape(()=>ctx.roundRect(x,y,w,h,r),fill,stroke,width);}
function line(points,color,width=2){shape(()=>{ctx.moveTo(...points[0]);for(const p of points.slice(1))ctx.lineTo(...p);},null,color,width);}
function textAt(str,x,y,size=14,color='#758064',align='center'){ctx.fillStyle=color;ctx.font=`500 ${size}px "Noto Sans SC",sans-serif`;ctx.textAlign=align;ctx.fillText(str,x,y);}
function heart(x,y,s,color){ctx.save();ctx.translate(x,y);ctx.scale(s,s);shape(()=>{ctx.moveTo(0,5);ctx.bezierCurveTo(-20,-7,-10,-19,0,-10);ctx.bezierCurveTo(10,-19,20,-7,0,5);},color,null);ctx.restore();}
function star(x,y,r,color){shape(()=>{for(let i=0;i<8;i++){const a=i*Math.PI/4;const len=i%2?r*.3:r;const px=x+Math.cos(a)*len,py=y+Math.sin(a)*len;i?ctx.lineTo(px,py):ctx.moveTo(px,py);}ctx.closePath();},color,null);}
function flower(x,y,s=1,color='#fff9e9'){ctx.save();ctx.translate(x,y);ctx.scale(s,s);line([[0,0],[0,-14]],'#8da56e',1.4);ellipse(-3,-7,4,2,'#a2ba7c');for(let i=0;i<5;i++){const a=i*TAU/5;ellipse(Math.cos(a)*4,-17+Math.sin(a)*4,3.6,3.6,color);}ellipse(0,-17,2.8,2.8,'#e6c36b');ctx.restore();}
function cloud(x,y,s,smile=false){ctx.save();ctx.translate(x,y);ctx.scale(s,s);shape(()=>{ctx.moveTo(-44,10);ctx.bezierCurveTo(-65,8,-58,-17,-39,-16);ctx.bezierCurveTo(-42,-43,-7,-45,0,-23);ctx.bezierCurveTo(18,-42,45,-23,38,-9);ctx.bezierCurveTo(65,-16,72,16,45,17);ctx.bezierCurveTo(18,21,-21,20,-44,10);},palettes[level].cloud,null);if(smile){ellipse(-9,-2,1.6,2,'#b7bd9e');ellipse(7,-2,1.6,2,'#b7bd9e');shape(()=>{ctx.arc(-1,1,5,0.2,Math.PI-.2);},null,'#c2c8ad',1.2);}ctx.restore();}
function tree(x,y,s,p){ctx.save();ctx.translate(x,y);ctx.scale(s,s);line([[0,8],[0,-95]],'#a0ae7b',7);line([[0,-37],[-21,-64]],'#a0ae7b',4);shape(()=>{ctx.moveTo(0,-137);ctx.bezierCurveTo(-18,-149,-37,-130,-33,-115);ctx.bezierCurveTo(-62,-115,-67,-76,-44,-68);ctx.bezierCurveTo(-53,-45,-23,-22,-7,-40);ctx.bezierCurveTo(9,-23,44,-35,41,-59);ctx.bezierCurveTo(70,-72,48,-111,32,-108);ctx.bezierCurveTo(34,-131,13,-146,0,-137);},p.leaf,null);line([[-10,-112],[-10,-100]],'#ffffff60',2);line([[19,-73],[19,-61]],'#ffffff55',2);ctx.restore();}

function drawDogSide(x,feet,scale,white,run,facing,jumping,happy){
  ctx.save();ctx.translate(x,feet);ctx.scale(scale*facing,scale);
  const ink='#171715',fur=white?'#fffefa':'#ead39f',stride=run?Math.sin(run)*8:0;
  ellipse(0,2,34,4,'#536b3b16');ctx.translate(0,run?Math.sin(run*2)*1.5:Math.sin(clock*2.6)*.6);
  // In profile the little line tail trails behind, and the muzzle leads the motion.
  shape(()=>{ctx.moveTo(-28,-13);ctx.quadraticCurveTo(-46,-6,-57,-17);ctx.moveTo(-35,-21);ctx.quadraticCurveTo(-45,-18,-48,-25);ctx.moveTo(-31,-27);ctx.quadraticCurveTo(-38,-25,-40,-32);},null,ink,3.4);
  if(white){
    shape(()=>{
      ctx.moveTo(-26,-52);ctx.quadraticCurveTo(-36,-42,-30,-35);ctx.quadraticCurveTo(-39,-29,-31,-23);
      ctx.quadraticCurveTo(-37,-15,-29,-10);ctx.quadraticCurveTo(-34,0,-21+stride,0);
      ctx.quadraticCurveTo(-10+stride,3,-5,-13);ctx.quadraticCurveTo(5,-2,14-stride,0);
      ctx.quadraticCurveTo(28-stride,2,25,-12);ctx.quadraticCurveTo(34,-17,29,-25);
      ctx.quadraticCurveTo(36,-30,29,-38);ctx.quadraticCurveTo(34,-45,27,-51);
      ctx.quadraticCurveTo(39,-51,40,-62);ctx.quadraticCurveTo(53,-66,43,-77);
      ctx.quadraticCurveTo(38,-89,29,-88);ctx.quadraticCurveTo(23,-98,15,-92);
      ctx.quadraticCurveTo(8,-99,1,-93);ctx.quadraticCurveTo(-6,-99,-13,-92);
      ctx.quadraticCurveTo(-23,-96,-29,-85);ctx.quadraticCurveTo(-43,-89,-44,-76);
      ctx.quadraticCurveTo(-47,-62,-32,-62);ctx.quadraticCurveTo(-33,-57,-26,-52);ctx.closePath();
    },fur,ink,4.2);
    shape(()=>{ctx.moveTo(-19,-79);ctx.quadraticCurveTo(-12,-66,-24,-61);},null,ink,3.7);
  }else{
    shape(()=>{
      ctx.moveTo(-28,-53);ctx.bezierCurveTo(-35,-39,-35,-14,-27+stride,-5);
      ctx.quadraticCurveTo(-18+stride,3,-7,-11);ctx.quadraticCurveTo(3,1,17-stride,0);
      ctx.quadraticCurveTo(29-stride,1,25,-22);ctx.quadraticCurveTo(27,-38,23,-52);
      ctx.quadraticCurveTo(37,-50,40,-62);ctx.quadraticCurveTo(53,-69,37,-79);
      ctx.bezierCurveTo(29,-96,5,-103,-14,-96);ctx.quadraticCurveTo(-28,-94,-35,-82);
      ctx.bezierCurveTo(-51,-84,-58,-70,-50,-59);ctx.quadraticCurveTo(-42,-49,-29,-58);
      ctx.quadraticCurveTo(-27,-55,-28,-53);ctx.closePath();
    },fur,ink,4.2);
    shape(()=>{ctx.moveTo(-27,-52);ctx.quadraticCurveTo(0,-43,25,-52);},null,'#ef8478',4.4);
    shape(()=>{ctx.moveTo(-26,-81);ctx.bezierCurveTo(-17,-69,-24,-54,-38,-57);},null,ink,3.8);
  }
  if(jumping){
    shape(()=>{ctx.moveTo(19,-39);ctx.quadraticCurveTo(42,-51,42,-39);ctx.quadraticCurveTo(42,-30,22,-27);},fur,ink,4.1);
  }else{
    shape(()=>{ctx.moveTo(14,-34);ctx.quadraticCurveTo(22+stride*.5,-23,13+stride*.4,-14);},null,ink,3.7);
  }
  ellipse(26,-78,2.8,3,ink);ellipse(42,-71,4.8,3.4,ink);
  if(jumping||happy)shape(()=>{ctx.moveTo(28,-62);ctx.quadraticCurveTo(31,-49,39,-63);},'#e99291',ink,2.8);
  shape(()=>{ctx.moveTo(42,-68);ctx.quadraticCurveTo(36,-56,26,-63);},null,ink,3.5);
  ctx.restore();
}
function drawDog(x,feet,scale=1,white=false,run=0,facing=1,jumping=false,happy=false,pose='auto'){
  if(pose==='left')facing=-1;if(pose==='right')facing=1;
  if(['side','left','right'].includes(pose)||(pose==='auto'&&(run!==0||jumping))){drawDogSide(x,feet,scale,white,run,facing,jumping,happy);return;}
  const back=pose==='back',hurt=pose==='hurt';
  ctx.save();ctx.translate(x,feet);ctx.scale(scale*facing,scale);
  const ink='#171715',fur=white?'#fffefa':'#ead39f',outline=4.2;
  const stride=run?Math.sin(run)*3:0,bob=run?Math.sin(run*2)*1.6:Math.sin(clock*2.6)*.7;
  ellipse(2,2,34,4,'#536b3b16');ctx.translate(0,bob);
  // The reference uses thin, flicking tail lines and a single flat body colour.
  ctx.save();ctx.translate(back?0:30,-10);ctx.rotate(Math.sin(clock*7)*.12);
  shape(()=>{ctx.moveTo(0,1);ctx.quadraticCurveTo(17,9,32,-1);ctx.moveTo(9,-5);ctx.quadraticCurveTo(17,-3,21,-9);ctx.moveTo(7,-12);ctx.quadraticCurveTo(13,-10,14,-16);},null,ink,3.4);
  ctx.restore();
  if(white){
    // Rounded rectangular ears, an uneven fluffy crown, and soft fur at the sides.
    shape(()=>{
      ctx.moveTo(-33,-53);ctx.quadraticCurveTo(-41,-44,-36,-36);
      ctx.quadraticCurveTo(-44,-29,-36,-24);ctx.quadraticCurveTo(-42,-17,-35,-13);
      ctx.quadraticCurveTo(-40,-3,-30,-4+stride);ctx.quadraticCurveTo(-29,3,-20,0+stride);
      ctx.quadraticCurveTo(-10,4,-7,-8);ctx.quadraticCurveTo(0,-19,8,-8);
      ctx.quadraticCurveTo(11,4,21,0-stride);ctx.quadraticCurveTo(31,3,31,-4-stride);
      ctx.quadraticCurveTo(41,-3,35,-13);ctx.quadraticCurveTo(44,-18,37,-25);
      ctx.quadraticCurveTo(45,-31,37,-37);ctx.quadraticCurveTo(44,-46,34,-53);
      ctx.quadraticCurveTo(43,-58,40,-66);ctx.quadraticCurveTo(57,-61,58,-73);
      ctx.lineTo(58,-86);ctx.quadraticCurveTo(58,-97,46,-94);
      ctx.quadraticCurveTo(36,-96,33,-88);ctx.quadraticCurveTo(27,-94,21,-90);
      ctx.quadraticCurveTo(15,-97,9,-91);ctx.quadraticCurveTo(2,-97,-5,-91);
      ctx.quadraticCurveTo(-12,-97,-18,-91);ctx.quadraticCurveTo(-27,-96,-33,-88);
      ctx.quadraticCurveTo(-37,-97,-48,-94);ctx.quadraticCurveTo(-60,-96,-58,-84);
      ctx.lineTo(-58,-73);ctx.quadraticCurveTo(-59,-61,-41,-66);
      ctx.quadraticCurveTo(-44,-58,-33,-53);ctx.closePath();
    },fur,ink,outline);
    if(!back&&jumping){
      shape(()=>{ctx.moveTo(-32,-43);ctx.quadraticCurveTo(-50,-57-(happy?17:0),-49,-42-(happy?17:0));ctx.quadraticCurveTo(-47,-31,-33,-29);ctx.moveTo(33,-43);ctx.quadraticCurveTo(49,-56-(happy?17:0),48,-42-(happy?17:0));ctx.quadraticCurveTo(47,-31,34,-29);},fur,ink,outline);
    }else if(!back){
      shape(()=>{ctx.moveTo(-23,-36);ctx.quadraticCurveTo(-28,-27,-23,-21);ctx.moveTo(24,-36);ctx.quadraticCurveTo(29,-27,24,-21);},null,ink,3.5);
    }
    if(!back){
    if(hurt){line([[-23,-73],[-15,-70]],ink,3.4);line([[15,-70],[23,-73]],ink,3.4);}else{ellipse(-18,-72,3.5,2.7,ink);ellipse(18,-72,3.5,2.7,ink);}
    ellipse(0,-66,6.3,4.7,ink);
    if(hurt){shape(()=>{ctx.moveTo(-13,-54);ctx.quadraticCurveTo(0,-62,13,-54);},null,ink,3.5);ellipse(-27,-62,2.5,4.5,'#bddbe3');}else{shape(()=>{ctx.moveTo(0,-62);ctx.lineTo(0,-58);ctx.bezierCurveTo(-5,-49,-18,-52,-24,-58);ctx.moveTo(0,-58);ctx.bezierCurveTo(5,-49,18,-52,24,-58);},null,ink,4.1);}
    }
  }else{
    // A wide, floppy-eared head merges into the body, with the familiar coral collar.
    const flap=jumping?-6:Math.sin(run||clock*2)*1.5;
    shape(()=>{
      ctx.moveTo(-29,-55);ctx.bezierCurveTo(-36,-39,-36,-12,-30,-5+stride);
      ctx.quadraticCurveTo(-23,3,-12,0+stride);ctx.quadraticCurveTo(-4,-1,0,-12);
      ctx.quadraticCurveTo(7,0,17,0-stride);ctx.bezierCurveTo(35,3,37,-3,33,-24);
      ctx.quadraticCurveTo(35,-39,31,-54);
      ctx.bezierCurveTo(44,-49+flap,61,-54+flap,57,-68+flap);
      ctx.bezierCurveTo(54,-78+flap,43,-80,32,-85);
      ctx.bezierCurveTo(14,-106,-16,-103,-30,-87);
      ctx.bezierCurveTo(-46,-94,-62,-82+flap,-56,-68+flap);
      ctx.bezierCurveTo(-52,-56+flap,-42,-56,-31,-61);
      ctx.quadraticCurveTo(-30,-58,-29,-55);ctx.closePath();
    },fur,ink,outline);
    shape(()=>{ctx.moveTo(-30,-51);ctx.quadraticCurveTo(0,-41,32,-52);},null,'#ef8478',4.4);
    if(!back&&jumping){
      shape(()=>{ctx.moveTo(-30,-41);ctx.quadraticCurveTo(-50,-53-(happy?18:0),-48,-39-(happy?18:0));ctx.quadraticCurveTo(-45,-29,-30,-29);ctx.moveTo(33,-41);ctx.quadraticCurveTo(50,-52-(happy?18:0),48,-38-(happy?18:0));ctx.quadraticCurveTo(45,-29,33,-29);},fur,ink,outline);
    }else if(!back){
      shape(()=>{ctx.moveTo(-18,-34);ctx.quadraticCurveTo(-22,-22,-16,-12);ctx.moveTo(19,-33);ctx.quadraticCurveTo(23,-20,19,-12);},null,ink,3.8);
    }
    if(back){shape(()=>{ctx.moveTo(-31,-82);ctx.quadraticCurveTo(-22,-69,-30,-61);ctx.moveTo(32,-82);ctx.quadraticCurveTo(25,-68,33,-60);},null,ink,3.6);}
    if(!back){
    if(hurt){line([[-21,-76],[-14,-73]],ink,3.4);line([[12,-73],[19,-76]],ink,3.4);}else{ellipse(-17,-76,2.8,3,ink);ellipse(15,-76,2.8,3,ink);}
    ellipse(-2,-71,5.1,3.8,ink);
    if(!hurt&&(jumping||happy)){
      shape(()=>{ctx.moveTo(-14,-62);ctx.quadraticCurveTo(-2,-45,11,-62);ctx.quadraticCurveTo(-2,-57,-14,-62);},'#e99291',ink,3.1);
    }
    if(hurt){shape(()=>{ctx.moveTo(-10,-59);ctx.quadraticCurveTo(-2,-65,7,-59);},null,ink,3.3);}else{shape(()=>{ctx.moveTo(-2,-68);ctx.lineTo(-2,-65);ctx.quadraticCurveTo(-8,-56,-17,-63);ctx.moveTo(-2,-65);ctx.quadraticCurveTo(5,-57,13,-63);},null,ink,3.7);}
    }
  }
  ctx.restore();
}
function groundDraw(x,w,y=GROUND,h=160,floating=false){const p=palettes[level];rect(x,y,w,h,floating?10:5,p.soil,null);ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();for(let xx=Math.floor(x/34)*34;xx<x+w;xx+=34)for(let yy=y+34;yy<y+h;yy+=29){ellipse(xx+(yy%2?9:0),yy,1.2,1.2,p.dot);}ctx.restore();shape(()=>{ctx.moveTo(x,y+15);ctx.lineTo(x,y+4);ctx.quadraticCurveTo(x,y,x+5,y);ctx.lineTo(x+w-5,y);ctx.quadraticCurveTo(x+w,y,x+w,y+5);ctx.lineTo(x+w,y+15);for(let xx=x+w;xx>x;xx-=12){ctx.quadraticCurveTo(xx-6,y+23,Math.max(x,xx-12),y+15);}ctx.closePath();},p.grass,null);line([[x+4,y+1],[x+w-4,y+1]],p.edge,1.5);for(let xx=x+20;xx<x+w-12;xx+=53)line([[xx-3,y-2],[xx-2,y-6],[xx+1,y-1],[xx+4,y-5]],p.edge,1.2);}
function coinDraw(x,y,t=0){ctx.save();ctx.translate(x,y+Math.sin(clock*3+t)*3);ctx.scale(.82+Math.sin(clock*2+t)*.13,1);ellipse(0,0,11,13,'#f5d77f','#bfa359',1.8);ellipse(0,0,7.3,9.3,null,'#e8bd59',1.2);star(0,0,6,'#c4a050');ctx.restore();}
function mushroom(e){const x=e.x+e.w/2,y=e.y+e.h;ctx.save();ctx.translate(x,y);if(e.dead){ctx.scale(1,.25);ctx.globalAlpha=Math.min(1,e.fade*3);}const step=Math.sin(clock*9+e.x)*2;ellipse(-8,-2+step*.4,7,3.5,'#8e7a61');ellipse(8,-2-step*.4,7,3.5,'#8e7a61');rect(-12,-25,24,24,8,'#f7e9c9','#887655',1.8);shape(()=>{ctx.moveTo(-24,-23);ctx.bezierCurveTo(-23,-51,23,-51,24,-23);ctx.quadraticCurveTo(0,-15,-24,-23);},level===2?'#b3a2bf':'#dba394','#887655',1.8);ellipse(-10,-33,5,4,'#fbe9cf');ellipse(8,-37,4,3,'#fbe9cf');ellipse(-4,-15,1.6,2.4,'#786952');ellipse(5,-15,1.6,2.4,'#786952');ctx.restore();}
function house(x,y,scale=1){ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);rect(-54,-80,108,80,9,'#f7e5c4','#a3946a',2);shape(()=>{ctx.moveTo(-68,-76);ctx.lineTo(0,-137);ctx.lineTo(68,-76);ctx.quadraticCurveTo(62,-65,53,-72);ctx.lineTo(0,-117);ctx.lineTo(-53,-72);ctx.quadraticCurveTo(-63,-65,-68,-76);},'#dbab99','#ad8a75',2.4);shape(()=>{ctx.moveTo(-20,0);ctx.lineTo(-20,-39);ctx.bezierCurveTo(-20,-67,20,-67,20,-39);ctx.lineTo(20,0);},'#b4c293','#92996c',2);ellipse(11,-25,2.3,2.3,'#849367');rect(-40,-60,20,22,4,'#f7f3da','#c0ad7c',1.6);line([[-30,-60],[-30,-38]],'#c0ad7c',1.4);heart(0,-88,.45,'#c58e7d');flower(-59,0,1.2);flower(59,0,1.1,'#f4c7ba');ctx.restore();}
function flagDraw(x,y,active=false,goal=false){line([[x,y],[x,y-(goal?137:105)]],'#8b9b70',3);ellipse(x,y-(goal?139:107),4,4,'#eee2ab','#9caa7d',1.5);shape(()=>{ctx.moveTo(x+1,y-(goal?130:98));ctx.quadraticCurveTo(x+28,y-(goal?121:88)+Math.sin(clock*3)*3,x+44,y-(goal?126:94));ctx.lineTo(x+44,y-(goal?96:67));ctx.quadraticCurveTo(x+23,y-(goal?91:62),x+1,y-(goal?100:69));ctx.closePath();},active?'#e9afa2':'#f7efce','#b6ae82',1.4);if(goal)heart(x+23,y-107,.5,'#cf9884');else textAt('⚑',x+22,y-76,17,active?'#fff5df':'#a3b381');}

function background(){const p=palettes[level];let grad=ctx.createLinearGradient(0,0,0,H);grad.addColorStop(0,p.sky);grad.addColorStop(1,p.bottom);ctx.fillStyle=grad;ctx.fillRect(0,0,W,H);
 if(level===2){for(let i=0;i<40;i++){const x=((i*137.3-camera*.06)%(W+80)+W+80)%(W+80)-40;const y=40+(i*71)%260;ctx.globalAlpha=.3+.5*Math.sin(clock*1.3+i)**2;star(x,y,2+(i%3),p.sun);}ctx.globalAlpha=1;ellipse(W*.83,98,27,27,p.sun);ellipse(W*.83+12,88,25,25,p.sky);}else{ellipse(W*.84-camera*.015,104,34,34,p.sun);for(let i=0;i<8;i++){let a=i*TAU/8;line([[W*.84-camera*.015+Math.cos(a)*43,104+Math.sin(a)*43],[W*.84-camera*.015+Math.cos(a)*48,104+Math.sin(a)*48]],p.sun,2);}}
 for(let i=0;i<5;i++){let x=((i*330+60-clock*3-camera*.09)%(W+300)+W+300)%(W+300)-130;cloud(x,105+(i%3)*42,.5+(i%3)*.15,i%2===0);}
 for(let layer=0;layer<3;layer++){const base=390+layer*43,amp=88-layer*14;ctx.beginPath();ctx.moveTo(0,H);for(let x=-10;x<W+20;x+=10){const yy=base+Math.sin((x+camera*(.08+layer*.07))/(170-layer*30)+layer*2)*amp*.65+Math.cos((x+camera*.12)/330+layer)*amp*.4;ctx.lineTo(x,yy);}ctx.lineTo(W,H);ctx.closePath();ctx.fillStyle=[p.far,p.hill,p.near][layer];ctx.fill();}
 for(let i=0;i<Math.ceil(W/360)+2;i++){let x=i*360-((camera*.28)%360)-70;tree(x,445,.65+(i%2)*.15,p);}
 for(let i=0;i<10;i++){const x=((i*173-camera*.23)%(W+60)+W+60)%(W+60);line([[x,451],[x-3,445],[x+2,447]],p.near,1.5);}
}

function makeLevel(n){let ends=[3800,4140,4460],length=ends[n];let gaps=n===0?[[980,1110],[1920,2070],[2900,3040]]:n===1?[[820,970],[1690,1850],[2680,2850],[3400,3550]]:[[900,1060],[1660,1830],[2590,2770],[3500,3670]];let terrain=[],start=0;for(const [a,b]of gaps){terrain.push({x:start,y:GROUND,w:a-start,h:220,ground:true});start=b;}terrain.push({x:start,y:GROUND,w:length-start,h:220,ground:true});
 const platforms=[{x:370,y:385,w:150,h:35},{x:650,y:310,w:135,h:35},{x:1220,y:390,w:145,h:35},{x:1460,y:300,w:130,h:35},{x:2190,y:385,w:160,h:35},{x:2470,y:300,w:135,h:35},{x:3150,y:380,w:150,h:35}];if(n>0)platforms.push({x:3740,y:365,w:150,h:35});
 const blocks=[{x:235,y:370,w:43,h:43,used:false,bump:0},{x:530,y:295,w:43,h:43,used:false,bump:0},{x:1380,y:365,w:43,h:43,used:false,bump:0},{x:2350,y:285,w:43,h:43,used:false,bump:0},{x:3230,y:265,w:43,h:43,used:false,bump:0}];
 let collectibles=[];for(const t of terrain){for(let x=t.x+150;x<t.x+t.w-80;x+=115)collectibles.push({x,y:440,t:x*.01,taken:false});}for(const p of platforms){for(let x=p.x+24;x<p.x+p.w-10;x+=36)collectibles.push({x,y:p.y-32,t:x*.01,taken:false});}for(const [a,b]of gaps){for(let i=0;i<3;i++)collectibles.push({x:a+20+i*(b-a-40)/2,y:370-(i===1?20:0),t:i,taken:false});}
 const enemies=[];for(let i=0;i<terrain.length;i++){let t=terrain[i];let x=t.x+Math.min(t.w-100,600);enemies.push({x,y:GROUND-41,w:42,h:41,vx:(i%2?1:-1)*(42+n*9),min:t.x+50,max:t.x+t.w-65,dead:false,fade:.4});if(n>0&&t.w>650)enemies.push({x:t.x+300,y:GROUND-41,w:42,h:41,vx:40+n*7,min:t.x+80,max:t.x+t.w-60,dead:false,fade:.4});}
 return{length,terrain,platforms,blocks,collectibles,enemies,checkpoint:n===0?1760:n===1?2050:2100,goal:length-175};
}
function resetPlayer(){player={x:checkpoint,y:GROUND-62,w:42,h:62,vx:0,vy:0,grounded:true,jumps:0,face:1,anim:0};camera=Math.max(0,Math.min(world.length-W,player.x-W*.25));coyote=0;jumpBuffer=0;keys.left=keys.right=false;}
function updateUI(){ $('coinCount').textContent=String(coins).padStart(2,'0');$('hearts').innerHTML=Array.from({length:3},(_,i)=>`<span class="${i>=lives?'empty':''}">♥</span>`).join('');$('hearts').setAttribute('aria-label',`剩余${lives}颗爱心`);$('worldName').textContent=names[level];document.querySelectorAll('[data-dot]').forEach(e=>e.classList.toggle('active',Number(e.dataset.dot)<=level));document.querySelectorAll('[data-route]').forEach(e=>e.classList.toggle('active',Number(e.dataset.route)<=level));$('tipText').textContent='小提示：'+tips[level];$('pauseBtn').disabled=!['running','paused'].includes(state);$('touchControls').classList.toggle('visible',state==='running'&&matchMedia('(pointer: coarse), (max-width: 700px)').matches);if(coins>best){best=coins;$('bestScore').textContent=String(best).padStart(2,'0');try{localStorage.setItem('puppy-adventure-best',String(best));}catch{}} }
function progress(){const p=state==='menu'?0:Math.min(100,Math.floor(player.x/world.goal*100));$('journeyPct').textContent=p;$('journeyBar').style.width=p+'%';}
function setOverlay(tag,title,desc,button,hint=''){ $('overlayTag').textContent=tag;$('overlayTitle').textContent=title;$('overlayDesc').textContent=desc;$('mainBtn').querySelector('span').textContent=button;$('startHint').textContent=hint;$('overlay').classList.remove('hidden');$('sceneNote').style.display='none'; }
function startGame(){level=0;coins=0;lives=3;loadLevel();}
function loadLevel(){hurtTimer=0;world=makeLevel(level);checkpoint=90;resetPlayer();particles=[];floatTexts=[];damageTimer=1;state='running';$('overlay').classList.add('hidden');$('sceneNote').style.display='none';updateUI();canvas.focus({preventScroll:true});toast(level===0?'出发！按两次跳跃，可以跳得更高哦。':level===1?'晚霞也在为你加油，继续往前吧。':'小白就在星光的那一头。');}
function toast(str){$('toast').textContent=str;$('toast').classList.add('visible');toastTimer=3;}
function burst(x,y,color,count=12){for(let i=0;i<count;i++){let a=Math.random()*TAU;particles.push({x,y,vx:Math.cos(a)*(40+Math.random()*110),vy:Math.sin(a)*100-60,life:.7,max:.7,color,size:2+Math.random()*3});}}
function floatText(str,x,y,color='#b18d43'){floatTexts.push({str,x,y,life:1,color});}
let audio;
function tone(freq,duration=.1,type='sine',volume=.04,delay=0){if(!soundOn)return;try{audio||=new(window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume();const o=audio.createOscillator(),g=audio.createGain(),now=audio.currentTime+delay;o.type=type;o.frequency.setValueAtTime(freq,now);g.gain.setValueAtTime(volume,now);g.gain.exponentialRampToValueAtTime(.001,now+duration);o.connect(g);g.connect(audio.destination);o.start(now);o.stop(now+duration);}catch{}}
function sfx(kind){if(kind==='jump'){tone(340,.13,'sine',.045);tone(510,.1,'sine',.025,.05);}if(kind==='coin'){tone(880,.12,'sine',.035);tone(1175,.18,'sine',.03,.07);}if(kind==='hit'){tone(180,.2,'triangle',.05);tone(130,.22,'triangle',.04,.1);}if(kind==='win'){[523,659,784,1047].forEach((f,i)=>tone(f,.28,'sine',.04,i*.12));}if(kind==='stomp')tone(230,.1,'triangle',.06);}
function jump(){if(state==='menu'){startGame();return;}if(state!=='running')return;jumpBuffer=.13;}
function loseLife(){if(damageTimer>0||state!=='running')return;hurtTimer=1.1;lives--;sfx('hit');burst(player.x+21,player.y+30,'#e6b6a0',16);if(lives<=0){state='gameover';setOverlay('休息一下，再出发','小狗也需要充充电','你收集了 '+coins+' 枚金币。小白会一直等你。','再试一次','新的冒险，从第一站开始');}else{resetPlayer();damageTimer=2.1;toast(checkpoint>90?'从小旗出发，继续奔向小白！':'没关系，再试一次就好。');}updateUI();}
function winLevel(){state=level===2?'victory':'levelwin';sfx('win');burst(world.goal,GROUND-80,'#e5b9a9',35);if(level===2)setOverlay('每一步，都是为了见到你','终于，抱到你啦 ♡','穿过草地、晚霞和星夜，你带回了 '+coins+' 枚金币和满满的喜欢。','再冒险一次','最佳金币已保存在这台设备上');else setOverlay('和小白碰个头，再去下一站','这一站，也找到你啦！','已经收集 '+coins+' 枚金币。下一段风景，我们一起去看看。','前往'+(level===0?'落日晚霞':'星光之约'),'到达下一站会补满爱心');updateUI();progress();}
function pause(){if(state==='running'){state='paused';keys.left=keys.right=false;setOverlay('慢慢来，不着急','歇一歇，等等风','暂停的这段时间，小白也在想你。','继续冒险','按 P 或 Esc 继续');}else if(state==='paused'){state='running';$('overlay').classList.add('hidden');canvas.focus({preventScroll:true});}updateUI();}
function mainAction(){if(state==='menu'||state==='gameover'||state==='victory')startGame();else if(state==='paused')pause();else if(state==='levelwin'){level++;lives=3;loadLevel();}}
function overlaps(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;}
function step(dt){clock+=dt;hurtTimer=Math.max(0,hurtTimer-dt);if(toastTimer>0){toastTimer-=dt;if(toastTimer<=0)$('toast').classList.remove('visible');}for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=260*dt;p.life-=dt;}particles=particles.filter(p=>p.life>0);for(const t of floatTexts){t.y-=32*dt;t.life-=dt;}floatTexts=floatTexts.filter(t=>t.life>0);
 if(state!=='running')return;
 damageTimer=Math.max(0,damageTimer-dt);jumpBuffer=Math.max(0,jumpBuffer-dt);coyote=Math.max(0,coyote-dt);
 const target=((keys.right?1:0)-(keys.left?1:0))*280,accel=player.grounded?2400:1700;player.vx+=Math.max(-accel*dt,Math.min(accel*dt,target-player.vx));if(Math.abs(player.vx)>3)player.face=player.vx>0?1:-1;
 if(player.grounded)coyote=.10;
 if(jumpBuffer>0&&(player.grounded||coyote>0||player.jumps<2)){let first=player.grounded||coyote>0;player.vy=first?-665:-600;player.jumps=first?1:2;player.grounded=false;coyote=0;jumpBuffer=0;sfx('jump');burst(player.x+21,player.y+60,palettes[level].cloud,6);}
 const solids=[...world.terrain,...world.platforms,...world.blocks];
 player.x+=player.vx*dt;player.x=Math.max(0,Math.min(world.length-player.w,player.x));for(const s of solids){if(overlaps(player,s)){if(player.vx>0)player.x=s.x-player.w;else if(player.vx<0)player.x=s.x+s.w;player.vx=0;}}
 const oldBottom=player.y+player.h;player.vy=Math.min(player.vy+1750*dt,1000);player.y+=player.vy*dt;player.grounded=false;
 for(const s of solids){if(!overlaps(player,s))continue;if(player.vy>=0&&oldBottom<=s.y+5){player.y=s.y-player.h;player.vy=0;player.grounded=true;player.jumps=0;}else if(player.vy<0){player.y=s.y+s.h;player.vy=40;if('used'in s&&!s.used){s.used=true;s.bump=1;coins+=3;floatText('+3',s.x+21,s.y-10);burst(s.x+21,s.y-20,'#eed18a');sfx('coin');updateUI();}}}
 if(!player.grounded&&player.jumps===0&&coyote<=0)player.jumps=1;
 if(player.grounded&&Math.abs(player.vx)>20)player.anim+=dt*13;else player.anim=0;
 for(const b of world.blocks)b.bump=Math.max(0,b.bump-dt*5);
 for(const c of world.collectibles){if(!c.taken&&overlaps(player,{x:c.x-12,y:c.y-14,w:24,h:28})){c.taken=true;coins++;burst(c.x,c.y,'#eac976',6);sfx('coin');updateUI();}}
 for(const e of world.enemies){if(e.dead){e.fade-=dt;continue;}e.x+=e.vx*dt;if(e.x<e.min){e.x=e.min;e.vx=Math.abs(e.vx);}if(e.x>e.max){e.x=e.max;e.vx=-Math.abs(e.vx);}if(overlaps(player,e)){if(player.vy>0&&oldBottom<=e.y+17){e.dead=true;player.vy=-475;player.jumps=1;coins+=2;floatText('+2',e.x+21,e.y);burst(e.x+21,e.y+15,'#dfb5a1');sfx('stomp');updateUI();}else if(damageTimer<=0){loseLife();return;}}}
 if(player.y>H+80){if(damageTimer>0){resetPlayer();damageTimer=1;}else loseLife();return;}
 if(checkpoint===90&&player.x>=world.checkpoint){checkpoint=world.checkpoint;toast('存档成功！小旗会记住你走过的路。');burst(checkpoint,GROUND-80,'#e7b1a1',18);tone(660,.15);tone(880,.2,'sine',.04,.12);}
 if(player.x>=world.goal-38&&player.grounded){winLevel();return;}
 const desired=Math.max(0,Math.min(world.length-W,player.x-W*.3));camera+=(desired-camera)*Math.min(1,dt*7);progress();
}
function drawBlocks(){for(const b of world.blocks){const yy=b.y-Math.sin(b.bump*Math.PI)*9;rect(b.x,yy+3,b.w,b.h,7,'#b7aa7e',null);rect(b.x,yy,b.w,b.h,7,b.used?'#d6c7a4':'#f4dfa3',b.used?'#b6a885':'#b5a06c',1.7);rect(b.x+5,yy+5,b.w-10,b.h-10,4,null,b.used?'#c4b594':'#ead08e',1);if(!b.used)textAt('?',b.x+b.w/2,yy+30,26,'#a69363');else ellipse(b.x+b.w/2,yy+b.h/2,2,2,'#b5a785');}}
function groundDetails(t){for(let x=t.x+45;x<t.x+t.w-15;x+=133){if(x>camera-50&&x<camera+W+50){flower(x,GROUND,.65+(Math.floor(x)%3)*.1,Math.floor(x)%2?'#fff9e4':'#eec4b4');if(x%3>1)flower(x+12,GROUND,.5);}}}
function drawGame(){background();if(state==='menu'){const houseX=W*.83;groundDraw(-5,W+10);tree(W*.08,GROUND,.93,palettes[level]);tree(W*.95,GROUND,.7,palettes[level]);house(houseX,GROUND,.8);for(let x=34;x<W;x+=110)flower(x,GROUND,.7+(x%3)*.1,x%2?'#fff8df':'#efd1bb');groundDraw(W*.13,100,385,30,true);groundDraw(W*.72,86,353,30,true);[0,1,2].forEach(i=>coinDraw(W*.13+20+i*29,352,i));coinDraw(W*.72+43,320,3);drawDog(W*.21,GROUND,1.03,false,0,1);drawDog(houseX-7,GROUND,.88,true,0,-1,false,true);heart(houseX-7,GROUND-100+Math.sin(clock*2)*4,.55,'#d5a198');textAt('小鸡毛',W*.21,GROUND+29,11,'#85926f');textAt('小白',houseX-7,GROUND+29,11,'#85926f');return;}
 ctx.save();ctx.translate(-camera,0);for(const t of world.terrain){if(t.x+t.w<camera-30||t.x>camera+W+30)continue;groundDraw(t.x,t.w);groundDetails(t);}for(const p of world.platforms){if(p.x+p.w<camera-50||p.x>camera+W+50)continue;groundDraw(p.x,p.w,p.y,p.h,true);flower(p.x+p.w-20,p.y,.65);}
 drawBlocks();for(const c of world.collectibles)if(!c.taken&&c.x>camera-30&&c.x<camera+W+30)coinDraw(c.x,c.y,c.t);
 for(const e of world.enemies)if(e.x>camera-60&&e.x<camera+W+60&&(!e.dead||e.fade>0))mushroom(e);
 flagDraw(world.checkpoint,GROUND,checkpoint>90);textAt(checkpoint>90?'已存档':'存档点',world.checkpoint+17,GROUND+25,10,'#8b9975');
 house(world.goal+55,GROUND,.8);flagDraw(world.goal-58,GROUND,true,true);
 const winning=state==='levelwin'||state==='victory';drawDog(world.goal+10,GROUND,.75,true,0,-1,false,winning);heart(world.goal+10,GROUND-89+Math.sin(clock*3)*3,.5,'#d5a198');
 if(damageTimer<=0||Math.floor(damageTimer*9)%2===0||state!=='running')drawDog(player.x+player.w/2,player.y+player.h,.72,false,player.anim,player.face,!player.grounded,winning,hurtTimer>0?'hurt':'auto');
 if(winning){for(let i=0;i<7;i++){let x=world.goal-60+(i*23)%140,y=GROUND-110-(i*37+clock*25)%100;heart(x,y,.25+(i%2)*.1,'#d9aaa0');}}
 for(const p of particles){ctx.globalAlpha=p.life/p.max;star(p.x,p.y,p.size,p.color);}ctx.globalAlpha=1;for(const t of floatTexts){ctx.globalAlpha=t.life;textAt(t.str,t.x,t.y,16,t.color);}ctx.globalAlpha=1;ctx.restore();
 if(state==='paused'||state==='gameover'||winning){ctx.fillStyle=level===2?'#ece8f185':'#f6f5e48f';ctx.fillRect(0,0,W,H);}
}
function frame(now){if(!lastTime)lastTime=now;let dt=Math.min((now-lastTime)/1000,.04);lastTime=now;const count=Math.max(1,Math.ceil(dt/(1/120)));for(let i=0;i<count;i++)step(dt/count);ctx.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);drawGame();if($('galleryDialog').open&&clock-lastGalleryPaint>.07){paintGallery();lastGalleryPaint=clock;}requestAnimationFrame(frame);}

$('mainBtn').addEventListener('click',mainAction);
const galleryPoses=[['front','正面'],['left','左侧'],['right','右侧'],['back','背影'],['run','奔跑'],['jump','跳跃'],['hurt','委屈一下'],['celebrate','开心庆祝']];
$('galleryContent').innerHTML=[false,true].map(white=>`<section class="gallery-character"><h3><span class="character-dot ${white?'white':''}"></span>${white?'小白':'小鸡毛'}<small>${white?'蓬松小白狗 · MALTESE':'红项圈小金毛 · GOLDEN'}</small></h3><div class="gallery-grid">${galleryPoses.map(([pose,label])=>`<figure class="dog-sample"><canvas data-dog="${white?'white':'golden'}" data-pose="${pose}" role="img" aria-label="${white?'小白':'小鸡毛'}${label}"></canvas><figcaption>${label}</figcaption></figure>`).join('')}</div></section>`).join('');
function paintGallery(){
  const previous=ctx;
  try{for(const el of document.querySelectorAll('.dog-sample canvas')){
    const r=el.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2);if(!r.width||!r.height)continue;
    const pw=Math.round(r.width*d),ph=Math.round(r.height*d);if(el.width!==pw||el.height!==ph){el.width=pw;el.height=ph;}
    ctx=el.getContext('2d');ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,pw,ph);
    const logicalWidth=r.width/r.height*160;ctx.setTransform(pw/logicalWidth,0,0,ph/160,0,0);
    const pose=el.dataset.pose,white=el.dataset.dog==='white',moving=pose==='run',jumping=pose==='jump'||pose==='celebrate';
    drawDog(logicalWidth/2,139+(pose==='jump'?Math.sin(clock*3)*5-6:0),1.08,white,moving?clock*12:0,1,jumping,pose==='celebrate',moving||pose==='jump'?'side':pose);
  }}finally{ctx=previous;}
}
$('galleryBtn').addEventListener('click',()=>{galleryWasRunning=state==='running';if(galleryWasRunning)pause();$('galleryDialog').showModal();paintGallery();});
function closeGallery(){$('galleryDialog').close();if(galleryWasRunning&&state==='paused')pause();galleryWasRunning=false;}
$('closeGallery').addEventListener('click',closeGallery);
$('galleryDialog').addEventListener('cancel',e=>{e.preventDefault();closeGallery();});
$('galleryDialog').addEventListener('click',e=>{if(e.target===$('galleryDialog')){const r=$('galleryDialog').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeGallery();}});
$('pauseBtn').addEventListener('click',pause);
$('restartBtn').addEventListener('click',()=>{if(state==='menu')return;startGame();});
$('soundBtn').addEventListener('click',()=>{soundOn=!soundOn;$('soundBtn').classList.toggle('muted',!soundOn);$('soundBtn').setAttribute('aria-pressed',String(soundOn));$('soundBtn').setAttribute('aria-label',soundOn?'关闭声音':'开启声音');$('soundBtn').title=soundOn?'关闭声音':'开启声音';if(soundOn){tone(660,.1);tone(880,.15,'sine',.04,.1);} });
$('helpBtn').addEventListener('click',()=>{previousState=state;if(state==='running')pause();$('helpDialog').showModal();});
function closeHelp(){ $('helpDialog').close();if(previousState==='running'&&state==='paused')pause(); }
$('closeHelp').addEventListener('click',closeHelp);
$('helpDialog').addEventListener('click',e=>{if(e.target===$('helpDialog')){const r=$('helpDialog').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeHelp();}});
$('helpDialog').addEventListener('cancel',e=>{e.preventDefault();closeHelp();});
document.addEventListener('keydown',e=>{if($('helpDialog').open||$('galleryDialog').open)return;if(e.target instanceof HTMLButtonElement&&['Space','Enter'].includes(e.code))return;const relevant=['ArrowLeft','ArrowRight','ArrowUp','Space','KeyA','KeyD','KeyW','KeyP','Escape'];if(!relevant.includes(e.code))return;e.preventDefault();if(e.code==='ArrowLeft'||e.code==='KeyA')keys.left=true;if(e.code==='ArrowRight'||e.code==='KeyD')keys.right=true;if(['Space','ArrowUp','KeyW'].includes(e.code)&&!e.repeat){if(state==='levelwin'||state==='victory'||state==='gameover')mainAction();else jump();}if((e.code==='KeyP'||e.code==='Escape')&&!e.repeat)pause();});
document.addEventListener('keyup',e=>{if(e.code==='ArrowLeft'||e.code==='KeyA')keys.left=false;if(e.code==='ArrowRight'||e.code==='KeyD')keys.right=false;});
window.addEventListener('blur',()=>{keys.left=keys.right=false;if(state==='running')pause();});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='running')pause();lastTime=0;});
document.querySelectorAll('[data-control]').forEach(b=>{const action=b.dataset.control;b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);b.classList.add('pressed');if(action==='jump')jump();else keys[action]=true;});const release=()=>{b.classList.remove('pressed');if(action!=='jump')keys[action]=false;};b.addEventListener('pointerup',release);b.addEventListener('pointercancel',release);b.addEventListener('lostpointercapture',release);});
// A read-only snapshot is useful for verifying a real input-driven playthrough.
window.puppyAdventure={getSnapshot:()=>({state,level:level+1,coins,lives,checkpoint,x:player?.x,y:player?.y,vy:player?.vy,jumps:player?.jumps,grounded:player?.grounded,worldLength:world?.length,goal:world?.goal})};
resize();updateUI();requestAnimationFrame(frame);
