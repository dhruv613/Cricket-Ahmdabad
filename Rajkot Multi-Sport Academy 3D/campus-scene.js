(function () {
  const source=document.currentScript?.src||document.querySelector('script[src*="campus-scene.js"]')?.src||new URL('./campus-scene.js',location.href).href;
  const entry=new URL('../campus/entry.js?v=32',source).href;
  if(!document.querySelector('link[data-campus-style]')){const style=document.createElement('link');style.rel='stylesheet';style.href=new URL('../campus/scene.css?v=31',source).href;style.dataset.campusStyle='';document.head.append(style);}
  class CampusScene extends HTMLElement {
    connectedCallback(){
      if(this._loading||this._api)return;
      this._loading=true;const generation=this._generation=(this._generation||0)+1,controller=this._controller=new AbortController();
      import(entry).then(module=>controller.signal.aborted?null:module.mountCampus(this,{signal:controller.signal})).then(api=>{
        if(generation!==this._generation||!this.isConnected){api?.dispose();return;}
        this._loading=false;this._api=api;if(this._pending!==undefined)api?.setSport(this._pending);
      }).catch(error=>{
        if(controller.signal.aborted||generation!==this._generation)return;
        this._loading=false;console.error('Campus could not load:',error);
        const status=document.getElementById('scene-status');
        if(status){status.hidden=false;status.dataset.state='error';const link=document.createElement('a');link.href='#facilities';link.textContent='Explore the facilities';status.replaceChildren('The 3D tour could not load. Refresh to try again, or ',link,'.');}
        this.dispatchEvent(new CustomEvent('campus:error',{detail:{message:error.message},bubbles:true}));
      });
    }
    disconnectedCallback(){this._generation=(this._generation||0)+1;this._controller?.abort();this._api?.dispose();this._api=null;this._loading=false;}
    setSport(key){this._pending=key;this._api?.setSport(key);}
    replayIntro(){this._pending=undefined;this._api?.replayIntro();}
    setPreset(preset){this._api?.setPreset(preset);}
  }
  if(!customElements.get('campus-scene'))customElements.define('campus-scene',CampusScene);
})();
