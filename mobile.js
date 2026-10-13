'use strict';
// Mobile-responsive overrides injected into every chapter page (server side).
const CSS = `<style id="m-resp">
img,video,svg,iframe,canvas{max-width:100%}img{height:auto}
@media (max-width:820px){
  html{-webkit-text-size-adjust:100%}
  .slide{padding:22px 16px 96px!important;overflow-y:auto!important;overflow-x:hidden!important;-webkit-overflow-scrolling:touch}
  h1{font-size:clamp(28px,8.5vw,40px)!important;letter-spacing:-1px!important;line-height:1.08!important}
  h2{font-size:clamp(23px,7vw,32px)!important;letter-spacing:-.5px!important;line-height:1.12!important}
  h3{font-size:clamp(18px,5vw,24px)!important}
  .cover h1{font-size:clamp(34px,11vw,54px)!important}
  .sub,.cover .sub{font-size:16px!important;line-height:1.5!important}
  .kicker{font-size:13px!important;letter-spacing:1px!important}
  .grid,.flow,.recap{grid-template-columns:1fr!important;height:auto!important;gap:16px!important}
  .card,.mini,.output,.nest{padding:16px!important;border-radius:16px!important;box-shadow:4px 4px 0 #222!important}
  .code,.commentSource,.attrVisual{font-size:13.5px!important;line-height:1.6!important;padding:14px!important;overflow-x:auto;border-radius:14px!important}
  .tagVisual{font-size:17px!important;flex-wrap:wrap}.tagBox{padding:9px 11px!important}
  .arrow{font-size:28px!important}
  .page{padding:16px!important;min-height:0!important}
  .readBox,.footer{position:static!important;left:auto!important;right:auto!important;bottom:auto!important;margin-top:16px!important}
  .readBox{font-size:15px!important;padding:12px 14px!important}
  .footer{font-size:12px!important;gap:8px;flex-wrap:wrap}
  .nav{right:10px!important;bottom:10px!important}.nav button{width:46px!important;height:42px!important;background:#fff}
  table{display:block;max-width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch}
  pre,code,kbd{white-space:pre-wrap;overflow-wrap:anywhere}
  p,li,td,th,h1,h2,h3,a{overflow-wrap:anywhere}
  body{overflow-wrap:break-word}
  main,header,section,footer{max-width:100%}
}
</style>`;

const JS = `<script id="m-resp-js">
(function(){
  var mq=window.matchMedia('(max-width:820px)'),busy=false;
  function fix(){
    busy=false;
    var all=document.querySelectorAll('.slide *');
    for(var i=0;i<all.length;i++){var el=all[i];
      if(!mq.matches){ if(el.dataset.mfix){el.style.gridTemplateColumns='';el.style.height='';el.style.flexWrap='';delete el.dataset.mfix} continue; }
      var cs=getComputedStyle(el);
      if(cs.display==='grid'){
        if(cs.gridTemplateColumns.split(' ').length>1){el.style.gridTemplateColumns='repeat(auto-fit,minmax(min(100%,160px),1fr))';el.dataset.mfix=1}
        if(el.style.height!=='auto'){el.style.height='auto';el.dataset.mfix=1}
      } else if(cs.display==='flex'&&cs.flexDirection==='row'&&el.children.length>1&&!el.closest('.nav')&&el.scrollWidth>el.clientWidth+1){
        el.style.flexWrap='wrap';el.dataset.mfix=1;
      }
    }
  }
  function sched(){if(!busy){busy=true;requestAnimationFrame(fix)}}
  window.addEventListener('load',sched);window.addEventListener('resize',sched);
  new MutationObserver(sched).observe(document.body,{subtree:true,attributes:true,attributeFilter:['class']});
  sched();
  var sx=null,sy=null;
  document.addEventListener('touchstart',function(e){
    if(e.target.closest('pre,.code,.commentSource,table,input,textarea,select')){sx=null;return}
    sx=e.touches[0].clientX;sy=e.touches[0].clientY;
  },{passive:true});
  document.addEventListener('touchend',function(e){
    if(sx===null)return;var t=e.changedTouches[0],dx=t.clientX-sx,dy=t.clientY-sy;sx=null;
    if(Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy)*1.5){
      if(dx<0&&typeof window.next==='function')window.next();
      else if(dx>0&&typeof window.prev==='function')window.prev();
    }
  },{passive:true});
})();
</script>`;

function inject(html) {
  const isDeck = html.indexOf('class="slide') !== -1;
  let out = html.includes('</head>') ? html.replace('</head>', CSS + '</head>') : CSS + html;
  if (isDeck) out = out.includes('</body>') ? out.replace('</body>', JS + '</body>') : out + JS;
  return out;
}
module.exports = { inject };
