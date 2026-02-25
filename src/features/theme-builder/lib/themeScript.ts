/** Returns minified ES5 JS for FOUC prevention. Runs before React hydrates. */
export function getThemeScript(): string {
  return `(function(){try{var id=localStorage.getItem('swashbuckler:activeCustomTheme');if(!id)return;var raw=localStorage.getItem('swashbuckler:customThemes');if(!raw)return;var themes=JSON.parse(raw);var theme;for(var i=0;i<themes.length;i++){if(themes[i].id===id){theme=themes[i];break;}}if(!theme)return;var colors=theme.resolvedColors;var root=document.documentElement;var keys=Object.keys(colors);for(var j=0;j<keys.length;j++){root.style.setProperty('--'+keys[j],colors[keys[j]]);}}catch(e){}})();`
}
