(window.webpackJsonp=window.webpackJsonp||[]).push([[0],{13:function(e,t,a){e.exports=a(25)},19:function(e,t,a){},23:function(e,t,a){},25:function(e,t,a){"use strict";a.r(t);var r=a(0),n=a.n(r),s=a(11),o=a.n(s),c=(a(19),a(4)),l=a(7),i=a(3),u=a(6),p=a(2),h=a(5),f=a(12),d=a(8),v=a(1),m=a.n(v),b=(a(23),m.a.mark(j)),y=m.a.mark(S),k=m.a.mark(A),g="https://queue.taskcluster.net/v1/task",O="https://staging.wpt.fyi",E=new Set(["PASS","OK"]),w=Object.freeze({NONE:0,LOADING:1,COMPLETE:2});function j(e){var t;return m.a.wrap(function(a){for(;;)switch(a.prev=a.next){case 0:t=e.length;case 1:if(!(t>0)){a.next=7;break}return t--,a.next=5,e[t];case 5:a.next=1;break;case 7:case"end":return a.stop()}},b,this)}function x(e,t){return e===t||!(!Array.isArray(e)||!Array.isArray(t))&&(e.length===t.length&&e.every(function(e,a){return e===t[a]}))}function C(e,t){if(e.size!==t.size)return!1;var a=!0,r=!1,n=void 0;try{for(var s,o=e[Symbol.iterator]();!(a=(s=o.next()).done);a=!0){var c=s.value;if(!t.has(c))return!1}}catch(l){r=!0,n=l}finally{try{a||null==o.return||o.return()}finally{if(r)throw n}}return!0}function S(e,t){var a,r,n;return m.a.wrap(function(t){for(;;)switch(t.prev=t.next){case 0:(a=Array.from(e.keys())).sort(),r=0;case 3:if(!(r<a.length)){t.next=10;break}return n=a[r],t.next=7,[n,e.get(n)];case 7:r++,t.next=3;break;case 10:case"end":return t.stop()}},y,this)}function M(e){for(var t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{},a=new URL("".concat(O,"/").concat(e)),r=[["label","master"],["product","chrome[experimental]"],["product","firefox[experimental]"],["product","safari[experimental]"]],n=0;n<r.length;n++){var s=r[n],o=Object(d.a)(s,2),c=o[0],l=o[1];a.searchParams.append(c,l)}for(var i=Object.keys(t),u=function(){var e=i[p],r=t[e];Array.isArray(r)?r.forEach(function(t){return a.searchParams.append(e,t)}):a.searchParams.append(e,r)},p=0;p<i.length;p++)u();return a}var _=function(e){function t(e){var a,r=arguments.length>1&&void 0!==arguments[1]?arguments[1]:null;return Object(i.a)(this,t),r||(r="Fetch for ".concat(e.url," returned status ").concat(e.status," ").concat(e.statusText)),(a=Object(u.a)(this,Object(p.a)(t).call(this,r))).resp=e,a.name="FetchError",a}return Object(h.a)(t,e),t}(Object(f.a)(Error));function D(e,t){return P.apply(this,arguments)}function P(){return(P=Object(l.a)(m.a.mark(function e(t,a){var r;return m.a.wrap(function(e){for(;;)switch(e.prev=e.next){case 0:return e.next=2,fetch(t,a);case 2:if((r=e.sent).ok){e.next=5;break}throw new _(r);case 5:return e.next=7,r.json();case 7:return e.abrupt("return",e.sent);case 8:case"end":return e.stop()}},e,this)}))).apply(this,arguments)}function A(e){var t,a,r,n,s,o,c;return m.a.wrap(function(l){for(;;)switch(l.prev=l.next){case 0:t=0,a=!0,r=!1,n=void 0,l.prev=4,s=e[Symbol.iterator]();case 6:if(a=(o=s.next()).done){l.next=14;break}return c=o.value,l.next=10,[t,c];case 10:t++;case 11:a=!0,l.next=6;break;case 14:l.next=20;break;case 16:l.prev=16,l.t0=l.catch(4),r=!0,n=l.t0;case 20:l.prev=20,l.prev=21,a||null==s.return||s.return();case 23:if(l.prev=23,!r){l.next=26;break}throw n;case 26:return l.finish(23);case 27:return l.finish(20);case 28:case"end":return l.stop()}},k,this,[[4,16,20,28],[21,,23,27]])}var I=/^(.*\.any)(:?\..*)\.html$/,L=/^(.*\.(:?worker|window))\.html$/;function N(e){var t=new URL("https://web-platform.test".concat(e)).pathname,a=I.exec(t);return null===a&&(a=L.exec(t)),null!==a&&(t=a[1]+".js"),t}var R=new(function(){function e(){Object(i.a)(this,e),this.url=new URL(window.location),this.params=this.url.searchParams}return Object(c.a)(e,[{key:"_update",value:function(){window.history.replaceState({},document.title,this.url.href)}},{key:"get",value:function(e){return this.params.get(e)}},{key:"has",value:function(e){return this.params.has(e)}},{key:"set",value:function(e,t){this.params.set(e,t),this._update()}},{key:"delete",value:function(e){this.params.delete(e),this._update()}},{key:"append",value:function(e,t){this.params.append(e,t),this._update()}}]),e}()),T=function(){var e=-1;return function(t,a){return{id:++e,err:t,options:a}}}(),G=function(e){function t(e){var a;return Object(i.a)(this,t),(a=Object(u.a)(this,Object(p.a)(t).call(this,e))).onError=function(e){var t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{},r=T(e,t);a.setState(function(e){return{errors:e.errors.concat(r)}})},a.onDismissError=function(e){var t=Array.from(a.state.errors),r=t.findIndex(function(t){return t.id===e});void 0!==r&&(t.splice(r,1),a.setState({errors:t}))},a.onComponentChange=function(e){var t=e.toLowerCase(),r=new Set(a.state.bugComponentsMap.get(t));R.set("bugComponent",e),R.delete("paths"),a.setState({currentBugComponent:t,selectedPaths:r})},a.onPathsChange=function(e){var t=Array.from(e);t.sort(),x(t,a.state.bugComponentsMap.get(a.state.currentBugComponent))?R.delete("paths"):R.set("paths",t.join(",")),a.setState({selectedPaths:e})},a.state={bugComponents:[],bugComponentsMap:new Map,currentBugComponent:null,selectedPaths:new Set,wptRuns:null,geckoMetadata:{},geckoMetadataForPaths:{},errors:[],loading_state:w.NONE},a}return Object(h.a)(t,e),Object(c.a)(t,[{key:"fetchData",value:function(){var e=Object(l.a)(m.a.mark(function e(t,a){var r,n=arguments;return m.a.wrap(function(e){for(;;)switch(e.prev=e.next){case 0:return(r=n.length>2&&void 0!==n[2]?n[2]:{}).hasOwnProperty("redirect")||(r.redirect="follow"),e.prev=2,e.next=5,D(t,r);case 5:return e.abrupt("return",e.sent);case 8:throw e.prev=8,e.t0=e.catch(2),this.onError(e.t0,{retry:a}),e.t0;case 12:case"end":return e.stop()}},e,this,[[2,8]])}));return function(t,a){return e.apply(this,arguments)}}()},{key:"loadTaskClusterData",value:function(){var e=Object(l.a)(m.a.mark(function e(t,a){var r,n,s,o,c,i,u,p,h,f,d,v,b,y=this;return m.a.wrap(function(e){for(;;)switch(e.prev=e.next){case 0:return r=function(){var e=Object(l.a)(m.a.mark(function e(){return m.a.wrap(function(e){for(;;)switch(e.prev=e.next){case 0:return e.next=2,y.loadTaskClusterData(t,a);case 2:return e.abrupt("return",e.sent);case 3:case"end":return e.stop()}},e,this)}));return function(){return e.apply(this,arguments)}}(),e.next=3,this.fetchData("".concat("https://index.taskcluster.net/v1/task","/").concat(t),r);case 3:return n=e.sent,s=n.taskId,e.next=7,this.fetchData("".concat(g,"/").concat(s,"/status"),r);case 7:o=e.sent,i=!0,u=!1,p=void 0,e.prev=11,h=j(o.status.runs)[Symbol.iterator]();case 13:if(i=(f=h.next()).done){e.next=21;break}if("completed"!==(d=f.value).state){e.next=18;break}return c=d.runId,e.abrupt("break",21);case 18:i=!0,e.next=13;break;case 21:e.next=27;break;case 23:e.prev=23,e.t0=e.catch(11),u=!0,p=e.t0;case 27:e.prev=27,e.prev=28,i||null==h.return||h.return();case 30:if(e.prev=30,!u){e.next=33;break}throw p;case 33:return e.finish(30);case 34:return e.finish(27);case 35:return e.next=37,this.fetchData("".concat(g,"/").concat(s,"/runs/").concat(c,"/artifacts"),r);case 37:return v=e.sent,b=v.artifacts.find(function(e){return e.name.endsWith(a)}),e.abrupt("return",this.fetchData("".concat(g,"/").concat(s,"/runs/").concat(c,"/artifacts/").concat(b.name),r));case 40:case"end":return e.stop()}},e,this,[[11,23,27,35],[28,,30,34]])}));return function(t,a){return e.apply(this,arguments)}}()},{key:"loadBugComponentData",value:function(){var e=Object(l.a)(m.a.mark(function e(){var t,a,r,n,s,o,c,l,i;return m.a.wrap(function(e){for(;;)switch(e.prev=e.next){case 0:return e.next=2,this.loadTaskClusterData("gecko.v2.mozilla-central.latest.source.source-bugzilla-info","components-normalized.json");case 2:t=e.sent,a=this.processComponentData(t),r=Object(d.a)(a,2),n=r[0],s=r[1],(n=Array.from(n).sort()).push("Any"),this.setState({bugComponentsMap:s,bugComponents:n}),!(o=this.state.currentBugComponent)&&R.has("bugComponent")&&(c=R.get("bugComponent"),s.has(c)&&(o=c)),o||(o=n[0].toLowerCase()),l=new Set(s.get(o)),R.has("paths")&&(i=new Set(R.get("paths").split(",")),l=new Set(Array.from(l).filter(function(e){return i.has(e)}))),this.setState({selectedPaths:l,currentBugComponent:o});case 13:case"end":return e.stop()}},e,this)}));return function(){return e.apply(this,arguments)}}()},{key:"loadWptRunData",value:function(){var e=Object(l.a)(m.a.mark(function e(){var t,a,r=this;return m.a.wrap(function(e){for(;;)switch(e.prev=e.next){case 0:return t=M("api/runs",{aligned:""}),e.next=3,this.fetchData(t,Object(l.a)(m.a.mark(function e(){return m.a.wrap(function(e){for(;;)switch(e.prev=e.next){case 0:return e.abrupt("return",r.loadWptRunData());case 1:case"end":return e.stop()}},e,this)})));case 3:a=e.sent,this.setState({wptRuns:a});case 5:case"end":return e.stop()}},e,this)}));return function(){return e.apply(this,arguments)}}()},{key:"loadGeckoMetadata",value:function(){var e=Object(l.a)(m.a.mark(function e(){var t,a=this;return m.a.wrap(function(e){for(;;)switch(e.prev=e.next){case 0:return e.next=2,this.fetchData("https://queue.taskcluster.net/v1/task/Ik2tnR1KQzi26GfvTQ2WHw/runs/0/artifacts/public/summary.json",Object(l.a)(m.a.mark(function e(){return m.a.wrap(function(e){for(;;)switch(e.prev=e.next){case 0:return e.abrupt("return",a.loadGeckoMetadata());case 1:case"end":return e.stop()}},e,this)})));case 2:t=e.sent,this.setState({geckoMetadata:t});case 4:case"end":return e.stop()}},e,this)}));return function(){return e.apply(this,arguments)}}()},{key:"componentDidMount",value:function(){var e=Object(l.a)(m.a.mark(function e(){var t,a,r;return m.a.wrap(function(e){for(;;)switch(e.prev=e.next){case 0:return this.setState({loading_state:w.LOADING}),t=this.loadBugComponentData(),a=this.loadWptRunData(),r=this.loadGeckoMetadata(),e.next=6,Promise.all([t,a,r]);case 6:this.setState({loading_state:w.COMPLETE});case 7:case"end":return e.stop()}},e,this)}));return function(){return e.apply(this,arguments)}}()},{key:"filterGeckoMetadata",value:function(){if(this.state.selectedPaths.size&&Object.keys(this.state.geckoMetadata).length){var e=d(Array.from(this.state.selectedPaths).map(function(e){return e.slice(1)})),t=[],a=!0,r=!1,n=void 0;try{for(var s,o=this.state.bugComponentsMap.values()[Symbol.iterator]();!(a=(s=o.next()).done);a=!0){var c=s.value;!this.state.selectedPaths.has(c)&&e.test(c.slice(1))&&t.push(c)}}catch(v){r=!0,n=v}finally{try{a||null==o.return||o.return()}finally{if(r)throw n}}for(var l=d(t),i={},u=this.state.geckoMetadata,p=Object.keys(u),h=0;h<p.length;h++){var f=p[h];!e.test(f)||null!==l&&l.test(f)||(i[f]=u[f])}this.setState({pathMetadata:i})}function d(e){return e.length?new RegExp("^(?:".concat(e.join("|"),")(?:$|/)")):null}}},{key:"processComponentData",value:function(e){var t=e.components,a=e.paths,r=new Map,n=new Map,s="testing/web-platform/tests",o=[[s,a.testing["web-platform"].tests]],c=/(.*)\/[^\/]*$/,l=[];for(n.set("any",[]);o.length;)for(var i=o.pop(),u=Object(d.a)(i,2),p=u[0],h=u[1],f=!1,v=Object.keys(h),m=0;m<v.length;m++){var b=v[m],y=h[b];if("object"===typeof y){var k="".concat(p,"/").concat(b);o.push([k,y])}else{if(f||p===s)continue;for(var g=p,O=t[y].join("::"),E=O.toLowerCase();g!==s;){if(r.has(g)&&r.get(g)===E){f=!0;break}g=c.exec(g)[1]}if(!f){r.set(p,E),n.has(E)||(n.set(E,[]),l.push(O));var w=p.slice(s.length);n.get(E).push(w),n.get("any").push(w),f=!0}}}return[l,n]}},{key:"componentDidUpdate",value:function(e,t){t.geckoMetadata===this.state.geckoMetadata&&x(t.selectedPaths,this.state.selectedPaths)||this.filterGeckoMetadata()}},{key:"render",value:function(){var e,t=this.state.bugComponentsMap.get(this.state.currentBugComponent);return e=this.state.loading_state!=w.COMPLETE?n.a.createElement("p",null,"Loading\u2026"):[n.a.createElement("section",{id:"selector"},n.a.createElement(B,{runs:this.state.wptRuns}),n.a.createElement(U,{onComponentChange:this.onComponentChange,components:this.state.bugComponents,value:this.state.currentBugComponent}),n.a.createElement(H,{paths:t,selectedPaths:this.state.selectedPaths,onChange:this.onPathsChange})),n.a.createElement("section",{id:"details"},n.a.createElement(re,null,n.a.createElement($,{label:"Firefox-only Failures",failsIn:["firefox"],passesIn:["safari","chrome"],runs:this.state.wptRuns,paths:Array.from(this.state.selectedPaths),geckoMetadata:this.state.pathMetadata,onError:this.onError},n.a.createElement("h2",null,"Firefox-only Failures"),n.a.createElement("p",null,"Tests that pass in Chrome and Safari but fail in Firefox.")),n.a.createElement($,{label:"All Firefox Failures",failsIn:["firefox"],passesIn:[],runs:this.state.wptRuns,paths:Array.from(this.state.selectedPaths),geckoMetadata:this.state.pathMetadata,onError:this.onError},n.a.createElement("h2",null,"All Firefox Failures"),n.a.createElement("p",null,"Tests that fail in Firefox")),n.a.createElement(Z,{label:"Gecko Data",data:this.state.pathMetadata,paths:Array.from(this.state.selectedPaths),onError:this.onError},n.a.createElement("h2",null,"Gecko metadata"),n.a.createElement("p",null,"Gecko metadata in ",n.a.createElement("code",null,"testing/web-platform/meta")," taken from latest mozilla-central."),n.a.createElement("p",null,"Note: this data is currently not kept up to date"))))],n.a.createElement("div",{id:"app"},n.a.createElement(z,{errors:this.state.errors,onDismissError:this.onDismissError}),n.a.createElement("header",null,n.a.createElement("h1",null,"wpt interop dashboard")),e)}}]),t}(r.Component),z=function(e){function t(){var e,a;Object(i.a)(this,t);for(var r=arguments.length,n=new Array(r),s=0;s<r;s++)n[s]=arguments[s];return(a=Object(u.a)(this,(e=Object(p.a)(t)).call.apply(e,[this].concat(n)))).onDismiss=function(e){a.props.onDismissError(e)},a}return Object(h.a)(t,e),Object(c.a)(t,[{key:"render",value:function(){var e=this;if(!this.props.errors.length)return null;var t=[],a=!0,r=!1,s=void 0;try{for(var o,c=function(){var a=o.value,r=(i=Object(d.a)(a,2))[0],s=i[1];t.push(n.a.createElement(F,{key:"error-".concat(s.id),error:s,onDismiss:function(){return e.onDismiss(r)}}))},l=A(this.props.errors)[Symbol.iterator]();!(a=(o=l.next()).done);a=!0){var i;c()}}catch(u){r=!0,s=u}finally{try{a||null==l.return||l.return()}finally{if(r)throw s}}return n.a.createElement("ul",{className:"errors"},t)}}]),t}(r.Component),F=function(e){function t(){return Object(i.a)(this,t),Object(u.a)(this,Object(p.a)(t).apply(this,arguments))}return Object(h.a)(t,e),Object(c.a)(t,[{key:"render",value:function(){var e=this,t=this.props.error,a=t.id,r=t.err,s=t.options,o=[];if(s.retry){o.push(n.a.createElement("button",{onClick:function(){e.props.onDismiss(a),s.retry()},key:"retry"},"Retry"))}return n.a.createElement("li",null,r.message||"Unknown Error",n.a.createElement("button",{onClick:function(){return e.props.onDismiss(a)}},"Close"),o)}}]),t}(r.Component),B=function(e){function t(){return Object(i.a)(this,t),Object(u.a)(this,Object(p.a)(t).apply(this,arguments))}return Object(h.a)(t,e),Object(c.a)(t,[{key:"render",value:function(){if(!this.props.runs)return null;var e=this.props.runs[0].revision,t=M("",{sha:this.props.runs[0].full_revision_hash});return n.a.createElement("dl",null,n.a.createElement("dt",null,"wpt SHA1:"),n.a.createElement("dd",null,n.a.createElement("a",{href:t},e)))}}]),t}(r.Component),U=function(e){function t(){var e,a;Object(i.a)(this,t);for(var r=arguments.length,n=new Array(r),s=0;s<r;s++)n[s]=arguments[s];return(a=Object(u.a)(this,(e=Object(p.a)(t)).call.apply(e,[this].concat(n)))).handleChange=function(e){a.props.onComponentChange(e.target.value)},a}return Object(h.a)(t,e),Object(c.a)(t,[{key:"render",value:function(){var e=this.props.components.map(function(e){return n.a.createElement("option",{value:e.toLowerCase(),key:e.toLowerCase()},e)});return this.props.value?n.a.createElement("section",null,n.a.createElement("label",null,"Bug Component: "),n.a.createElement("select",{onChange:this.handleChange,value:this.props.value},e)):null}}]),t}(r.Component),H=function(e){function t(e){var a;return Object(i.a)(this,t),(a=Object(u.a)(this,Object(p.a)(t).call(this,e))).onCheckboxChange=function(e,t){var r=new Set(a.state.paths);t?r.add(e):r.delete(e),a.setState({paths:r})},a.onUpdateClick=function(){a.props.onChange(a.state.paths)},a.state={paths:new Set(a.props.paths)},a}return Object(h.a)(t,e),Object(c.a)(t,[{key:"componentDidUpdate",value:function(e){e.selectedPaths!==this.props.selectedPaths&&this.setState({paths:new Set(this.props.selectedPaths)})}},{key:"render",value:function(){var e=this;if(!this.props.paths)return null;var t=this.props.paths.sort().map(function(t){return n.a.createElement("li",{key:t},n.a.createElement(W,{checked:e.props.selectedPaths.has(t),value:t,onCheckboxChange:e.onCheckboxChange}),t)});return n.a.createElement("section",null,n.a.createElement("h2",null,"Test Paths"),n.a.createElement("button",{onClick:this.onUpdateClick,disabled:C(this.state.paths,this.props.selectedPaths)},"Update"),n.a.createElement("ul",{id:"test-paths"},t))}}]),t}(r.Component),W=function(e){function t(e){var a;return Object(i.a)(this,t),(a=Object(u.a)(this,Object(p.a)(t).call(this,e))).handleChange=function(e){a.setState({checked:!!e.target.checked}),a.props.onCheckboxChange(a.props.value,e.target.checked)},a.state={checked:a.props.checked},a}return Object(h.a)(t,e),Object(c.a)(t,[{key:"render",value:function(){return n.a.createElement("input",{name:this.props.path,type:"checkbox",checked:this.state.checked,onChange:this.handleChange})}}]),t}(r.Component),$=function(e){function t(e){var a;return Object(i.a)(this,t),(a=Object(u.a)(this,Object(p.a)(t).call(this,e))).state={loading_state:w.NONE,results:[]},a}return Object(h.a)(t,e),Object(c.a)(t,[{key:"buildQuery",value:function(){var e={run_ids:this.props.runs.map(function(e){return e.id}),query:{and:[]}},t=e.query.and,a=!0,r=!1,n=void 0;try{for(var s,o=this.props.failsIn[Symbol.iterator]();!(a=(s=o.next()).done);a=!0){var c=s.value,l=!0,i=!1,u=void 0;try{for(var p,h=E[Symbol.iterator]();!(l=(p=h.next()).done);l=!0){var f=p.value;t.push({not:{browser_name:c,status:f}})}}catch(_){i=!0,u=_}finally{try{l||null==h.return||h.return()}finally{if(i)throw u}}}}catch(_){r=!0,n=_}finally{try{a||null==o.return||o.return()}finally{if(r)throw n}}var d=!0,v=!1,m=void 0;try{for(var b,y=this.props.passesIn[Symbol.iterator]();!(d=(b=y.next()).done);d=!0){var k=b.value,g=void 0;if(E.size>1){var O={or:[]};t.push(O),g=O.or}else g=t;var w=!0,j=!1,x=void 0;try{for(var C,S=E[Symbol.iterator]();!(w=(C=S.next()).done);w=!0){var M=C.value;g.push({browser_name:k,status:M})}}catch(_){j=!0,x=_}finally{try{w||null==S.return||S.return()}finally{if(j)throw x}}}}catch(_){v=!0,m=_}finally{try{d||null==y.return||y.return()}finally{if(v)throw m}}return this.props.paths.length>1?t.push({or:this.props.paths.map(function(e){return{pattern:e+"/"}})}):t.push({pattern:this.props.paths[0]}),e}},{key:"fetchResults",value:function(){var e=Object(l.a)(m.a.mark(function e(){var t,a,r,n=this;return m.a.wrap(function(e){for(;;)switch(e.prev=e.next){case 0:return t=this.buildQuery(),e.prev=1,e.next=4,D(M("api/search",{}),{method:"POST",body:JSON.stringify(t),headers:{"Content-Type":"application/json"}});case 4:a=e.sent,e.next=12;break;case 7:throw e.prev=7,e.t0=e.catch(1),this.props.onError(e.t0,{retry:function(){var e=Object(l.a)(m.a.mark(function e(){return m.a.wrap(function(e){for(;;)switch(e.prev=e.next){case 0:return e.abrupt("return",n.fetchResults());case 1:case"end":return e.stop()}},e,this)}));return function(){return e.apply(this,arguments)}}()}),this.setState({loading_state:w.COMPLETE}),e.t0;case 12:r=new RegExp(this.props.paths.map(function(e){return"^".concat(e,"/")}).join("|")),a.results=a.results.filter(function(e){return r.test(e.test)}),this.setState({results:a,loading_state:w.COMPLETE});case 15:case"end":return e.stop()}},e,this,[[1,7]])}));return function(){return e.apply(this,arguments)}}()},{key:"getMetadata",value:function(e){var t=new Map,a=e.split("/"),r=a[a.length-1];a=a.slice(1,a.length-1);var n="";function s(e){for(var a=Object.entries(e),r=0;r<a.length;r++){var n=a[r],s=Object(d.a)(n,2),o=s[0],c=s[1];"_"!==o[0]&&t.set(o,c)}}var o=!0,c=!1,l=void 0;try{for(var i,u=a[Symbol.iterator]();!(o=(i=u.next()).done);o=!0){var p=i.value;n.length&&(n+="/"),n+=p;var h=this.props.geckoMetadata[n];h&&s(h)}}catch(E){c=!0,l=E}finally{try{o||null==u.return||u.return()}finally{if(c)throw l}}var f=this.props.geckoMetadata[n];if(f&&f._tests&&f._tests[r]){var v=f._tests[r];if(s(v),v._subtests){t._subtests=new Map;for(var m=Object.entries(v._subtests),b=0;b<m.length;b++){var y=m[b],k=Object(d.a)(y,2),g=k[0],O=k[1];t._subtests.set(g,new Map(Object.entries(O)))}}}return t}},{key:"render",value:function(){var e=this;if(this.state.loading_state!==w.COMPLETE)return n.a.createElement("div",null,this.props.children,n.a.createElement("p",null,"Loading\u2026"));if(null===this.state.results)return n.a.createElement("div",null,this.props.children,n.a.createElement("p",null,"Load failed"));if(!this.state.results.results.length)return n.a.createElement("div",null,this.props.children,n.a.createElement("p",null,"No results"));var t=this.state.results.results.map(function(t){return n.a.createElement(Q,{failsIn:e.props.failsIn,passesIn:e.props.passesIn,runs:e.props.runs,result:t,key:t.test,geckoMetadata:e.getMetadata(t.test),onError:e.props.onError})});return t.sort(function(e,t){return e.key>t.key?1:e.key===t.key?0:-1}),n.a.createElement("div",null,this.props.children,n.a.createElement("p",null,this.state.results.results.length," top-level tests with \xa0",this.state.results.results.map(function(e){return e.legacy_status[0].total}).reduce(function(e,t){return e+t},0)," subtests"),n.a.createElement("ul",null,t))}},{key:"componentDidMount",value:function(){var e=Object(l.a)(m.a.mark(function e(){return m.a.wrap(function(e){for(;;)switch(e.prev=e.next){case 0:return e.next=2,this.fetchIfPossible({});case 2:case"end":return e.stop()}},e,this)}));return function(){return e.apply(this,arguments)}}()},{key:"componentDidUpdate",value:function(){var e=Object(l.a)(m.a.mark(function e(t){return m.a.wrap(function(e){for(;;)switch(e.prev=e.next){case 0:return e.next=2,this.fetchIfPossible(t);case 2:case"end":return e.stop()}},e,this)}));return function(t){return e.apply(this,arguments)}}()},{key:"fetchIfPossible",value:function(){var e=Object(l.a)(m.a.mark(function e(t){return m.a.wrap(function(e){for(;;)switch(e.prev=e.next){case 0:if(this.state.loading_state!==w.LOADING){e.next=2;break}return e.abrupt("return");case 2:if(null!==this.props.runs){e.next=4;break}return e.abrupt("return");case 4:if(this.props.paths){e.next=6;break}return e.abrupt("return");case 6:if(this.state.loading_state!==w.COMPLETE||this.props.paths!==t.paths||this.props.failsIn!==t.failsIn||this.props.passesIn!==t.passesIn){e.next=8;break}return e.abrupt("return");case 8:if(this.props.paths.length){e.next=11;break}return this.setState({results:{results:[]},loading_state:w.COMPLETE}),e.abrupt("return");case 11:return this.setState({results:null,loading_state:w.LOADING}),e.next=14,this.fetchResults();case 14:case"end":return e.stop()}},e,this)}));return function(t){return e.apply(this,arguments)}}()}]),t}(r.Component),q=function(e){function t(e){var a;return Object(i.a)(this,t),(a=Object(u.a)(this,Object(p.a)(t).call(this,e))).handleClick=function(){a.setState({showDetails:!a.state.showDetails})},a.state={showDetails:!1},a}return Object(h.a)(t,e),Object(c.a)(t,[{key:"render",value:function(){return n.a.createElement("li",{className:"tree-row"+(this.state.showDetails?" tree-row-expanded":"")},n.a.createElement("span",{onClick:this.handleClick},this.state.showDetails?"\u25bc ":"\u25b6 ",this.props.rowTitle),this.props.rowExtra,this.state.showDetails?n.a.createElement("div",{className:"tree-row"},this.props.children):"")}}]),t}(r.Component),Q=function(e){function t(){return Object(i.a)(this,t),Object(u.a)(this,Object(p.a)(t).apply(this,arguments))}return Object(h.a)(t,e),Object(c.a)(t,[{key:"render",value:function(){var e="".concat(this.props.result.test," [").concat(this.props.result.legacy_status[0].total," subtests]");return n.a.createElement(q,{rowTitle:n.a.createElement("code",null,e),rowExtra:null},n.a.createElement(J,{runs:this.props.runs,test:this.props.result.test,passesIn:this.props.passesIn,failsIn:this.props.failsIn,geckoMetadata:this.props.geckoMetadata,onError:this.props.onError}))}}]),t}(r.Component),J=function(e){function t(e){var a;return Object(i.a)(this,t),(a=Object(u.a)(this,Object(p.a)(t).call(this,e))).state={loaded:!1,results:null},a}return Object(h.a)(t,e),Object(c.a)(t,[{key:"processResultData",value:function(e){var t=this,a=new Map,r=!0,n=!1,s=void 0;try{for(var o,c=e[Symbol.iterator]();!(r=(o=c.next()).done);r=!0){var l=o.value,i=Object(d.a)(l,2),u=i[0],p=i[1];a.has(null)||a.set(null,new Map),a.get(null).set(u,{status:p.status,message:p.message});var h=!0,f=!1,v=void 0;try{for(var m,b=p.subtests[Symbol.iterator]();!(h=(m=b.next()).done);h=!0){var y=m.value;a.has(y.name)||a.set(y.name,new Map),a.get(y.name).set(u,{status:y.status,message:y.message})}}catch(B){f=!0,v=B}finally{try{h||null==b.return||b.return()}finally{if(f)throw v}}}}catch(B){n=!0,s=B}finally{try{r||null==c.return||c.return()}finally{if(n)throw s}}var k=!0,g=!1,O=void 0;try{for(var w,j=a.values()[Symbol.iterator]();!(k=(w=j.next()).done);k=!0){var x=w.value,C=!0,S=!1,M=void 0;try{for(var _,D=this.props.runs[Symbol.iterator]();!(C=(_=D.next()).done);C=!0){var P=_.value.browser_name;x.has(P)||x.set(P,{status:"MISSING",message:null})}}catch(B){S=!0,M=B}finally{try{C||null==D.return||D.return()}finally{if(S)throw M}}}}catch(B){g=!0,O=B}finally{try{k||null==j.return||j.return()}finally{if(g)throw O}}var A=new Map,I=!0,L=!1,N=void 0;try{for(var R,T=function(){var e=R.value,a=(z=Object(d.a)(e,2))[0],r=z[1];t.props.passesIn.every(function(e){return E.has(r.get(e).status)})&&t.props.failsIn.every(function(e){return!E.has(r.get(e).status)})&&A.set(a,r)},G=a[Symbol.iterator]();!(I=(R=G.next()).done);I=!0){var z;T()}}catch(B){L=!0,N=B}finally{try{I||null==G.return||G.return()}finally{if(L)throw N}}var F=[];return A.has(null)&&(F.push([null,A.get(null)]),A.delete(null)),F.concat(Array.from(A))}},{key:"fetchData",value:function(){var e=Object(l.a)(m.a.mark(function e(){var t,a,r,n,s,o,c,l,i,u,p,h,f,v,b,y,k,g,O,E,w,j,x,C,S,M;return m.a.wrap(function(e){for(;;)switch(e.prev=e.next){case 0:for(t=new Map,a=[],r=[],n=!0,s=!1,o=void 0,e.prev=6,c=this.props.runs[Symbol.iterator]();!(n=(l=c.next()).done);n=!0)i=l.value,u=i.browser_name,p=i.results_url,(h=p.split("-")).pop(),f="".concat(h.join("-")).concat(this.props.test),v=D(f).then(function(e){return{success:!0,value:e}}).catch(function(e){return{success:!1,value:e}}),a.push(u),r.push(v);e.next=14;break;case 10:e.prev=10,e.t0=e.catch(6),s=!0,o=e.t0;case 14:e.prev=14,e.prev=15,n||null==c.return||c.return();case 17:if(e.prev=17,!s){e.next=20;break}throw o;case 20:return e.finish(17);case 21:return e.finish(14);case 22:return e.next=24,Promise.all(r);case 24:for(b=e.sent,y=!0,k=!1,g=void 0,e.prev=28,O=A(b)[Symbol.iterator]();!(y=(E=O.next()).done);y=!0)w=E.value,j=Object(d.a)(w,2),x=j[0],(C=j[1]).success&&(S=a[x],t.set(S,C.value));e.next=36;break;case 32:e.prev=32,e.t1=e.catch(28),k=!0,g=e.t1;case 36:e.prev=36,e.prev=37,y||null==O.return||O.return();case 39:if(e.prev=39,!k){e.next=42;break}throw g;case 42:return e.finish(39);case 43:return e.finish(36);case 44:M=this.processResultData(t),this.setState({results:M,loaded:!0});case 46:case"end":return e.stop()}},e,this,[[6,10,14,22],[15,,17,21],[28,32,36,44],[37,,39,43]])}));return function(){return e.apply(this,arguments)}}()},{key:"componentDidMount",value:function(){var e=Object(l.a)(m.a.mark(function e(){return m.a.wrap(function(e){for(;;)switch(e.prev=e.next){case 0:return e.next=2,this.fetchData();case 2:case"end":return e.stop()}},e,this)}));return function(){return e.apply(this,arguments)}}()},{key:"render",value:function(){var e=this;if(!this.state.loaded)return n.a.createElement("p",null,"Loading");var t=this.props.runs.map(function(e){return n.a.createElement("th",{key:e.browser_name},e.browser_name)});t.push(n.a.createElement("th",{key:"metadata"}));var a=this.props.geckoMetadata.get("_subtests")||new Map,r=this.state.results.map(function(t){var r=Object(d.a)(t,2),s=r[0],o=r[1];return n.a.createElement(X,{key:s,runs:e.props.runs,subtest:s,results:o,geckoMetadata:a.get(s)})});return n.a.createElement("div",null,n.a.createElement("ul",null,n.a.createElement("li",null,n.a.createElement("a",{href:"http://w3c-test.org".concat(this.props.test)},"Live test")),n.a.createElement("li",null,n.a.createElement("a",{href:M("results/".concat(this.props.test))},"wpt.fyi")),n.a.createElement("li",null,n.a.createElement("a",{href:"http://searchfox.org/mozilla-central/source/testing/web-platform/meta".concat(N(this.props.test),".ini")},"Gecko Metadata"))),n.a.createElement(K,{test:this.props.test,data:this.props.geckoMetadata}),n.a.createElement("section",null,n.a.createElement("h3",null,"Results"),n.a.createElement("table",{className:"results"},n.a.createElement("thead",null,n.a.createElement("tr",null,n.a.createElement("th",null),t)),n.a.createElement("tbody",null,r))))}}]),t}(r.Component),K=function(e){function t(){return Object(i.a)(this,t),Object(u.a)(this,Object(p.a)(t).apply(this,arguments))}return Object(h.a)(t,e),Object(c.a)(t,[{key:"render",value:function(){var e,t=this,a=function(e){return n.a.createElement(te,{value:e})};this.props.data?e=[{name:"disabled",render:a},{name:"bug",render:a},{name:"crash",title:"Crashes",render:a}].map(function(e){return t.props.data.has(e.name)?n.a.createElement(V,{key:e.name,title:e.title?e.title:(a=e.name,a&&a[0].toUpperCase()+a.slice(1)),values:t.props.data.get(e.name),render:e.render}):null;var a}).filter(function(e){return null!==e}):e=[];return 0===e.length?null:n.a.createElement("section",null,n.a.createElement("h3",null,"Gecko Metadata"),n.a.createElement("ul",null,e))}}]),t}(r.Component),V=function(e){function t(){return Object(i.a)(this,t),Object(u.a)(this,Object(p.a)(t).apply(this,arguments))}return Object(h.a)(t,e),Object(c.a)(t,[{key:"render",value:function(){return this.props.values?1===this.props.values.length&&null===this.props.values[0][0]?n.a.createElement("li",null,this.props.title,": ",this.props.render(this.props.values[0])):n.a.createElement(ee,{title:this.props.title,values:this.props.values,render:this.props.render}):null}}]),t}(r.Component),X=function(e){function t(){return Object(i.a)(this,t),Object(u.a)(this,Object(p.a)(t).apply(this,arguments))}return Object(h.a)(t,e),Object(c.a)(t,[{key:"render",value:function(){var e=this,t=this.props.runs.map(function(t){var a=e.props.results.get(t.browser_name);return n.a.createElement(Y,{result:a,key:t.browser_name})});return t.push(n.a.createElement("td",{key:"metadata"},n.a.createElement(K,{data:this.props.geckoMetadata}))),n.a.createElement("tr",null,n.a.createElement("th",null,this.props.subtest?this.props.subtest:"<parent>"),t)}}]),t}(r.Component),Y=function(e){function t(){return Object(i.a)(this,t),Object(u.a)(this,Object(p.a)(t).apply(this,arguments))}return Object(h.a)(t,e),Object(c.a)(t,[{key:"render",value:function(){return n.a.createElement("td",{className:"result result-".concat(this.props.result.status.toLowerCase()),title:this.props.result.message},this.props.result.status)}}]),t}(r.Component),Z=function(e){function t(){return Object(i.a)(this,t),Object(u.a)(this,Object(p.a)(t).apply(this,arguments))}return Object(h.a)(t,e),Object(c.a)(t,[{key:"groupData",value:function(){for(var e=new Map,t=new Map,a=new Map,r=Object.entries(this.props.data),n=0;n<r.length;n++){var s=r[n],o=Object(d.a)(s,2),c=o[0],l=o[1];if(l.disabled&&e.set(c,l.disabled),l["lsan-allowed"]&&t.set(c,l["lsan-allowed"]),l.expected_CRASH&&a.set(c,l.expected_CRASH.map(function(e){return[e,null]})),l._tests)for(var i=Object.entries(l._tests),u=0;u<i.length;u++){var p=i[u],h=Object(d.a)(p,2),f=h[0],v=h[1],m="".concat(c,"/").concat(f);if(v.disabled&&e.set(m,v.disabled),v.expected_CRASH&&a.set(m,v.expected_CRASH.map(function(e){return[e,null]})),v._subtests)for(var b=Object.entries(v._subtests),y=0;y<b.length;y++){var k=b[y],g=Object(d.a)(k,2),O=g[0],E=g[1],w="".concat(c,"/").concat(f," | ").concat(O);E.disabled&&e.set(w,E.disabled),E.expected_CRASH&&a.set(w,E.expected_CRASH.map(function(e){return[e,null]}))}}}return{disabled:e,lsan:t,crashes:a}}},{key:"render",value:function(){var e;if(null!==this.props.data){e=[];var t=this.groupData();if(t.crashes){var a=[],r=!0,s=!1,o=void 0;try{for(var c,l=S(t.crashes)[Symbol.iterator]();!(r=(c=l.next()).done);r=!0){var i=c.value,u=Object(d.a)(i,2),p=u[0],h=u[1];a.push(n.a.createElement(ee,{key:p,title:p,values:h,render:function(e){return null}}))}}catch(N){s=!0,o=N}finally{try{r||null==l.return||l.return()}finally{if(s)throw o}}a.length&&e.push(n.a.createElement("section",{key:"crashes"},n.a.createElement("h2",null,"Crashes"),n.a.createElement("p",null,a.length," tests crash in some configurations"),n.a.createElement("ul",null,a)))}if(t.disabled){var f=[],v=!0,m=!1,b=void 0;try{for(var y,k=S(t.disabled)[Symbol.iterator]();!(v=(y=k.next()).done);v=!0){var g=y.value,O=Object(d.a)(g,2),E=O[0],w=O[1];f.push(n.a.createElement(ee,{key:E,title:E,values:w,render:function(e){return n.a.createElement(te,{value:e})}}))}}catch(N){m=!0,b=N}finally{try{v||null==k.return||k.return()}finally{if(m)throw b}}f.length&&e.push(n.a.createElement("section",{key:"disabled"},n.a.createElement("h2",null,"Disabled"),n.a.createElement("p",null,f.length," tests are disabled in some configurations"),n.a.createElement("ul",null,f)))}if(t.lsan){var j=[],x=!0,C=!1,M=void 0;try{for(var _,D=S(t.lsan)[Symbol.iterator]();!(x=(_=D.next()).done);x=!0){var P=_.value,A=Object(d.a)(P,2),I=A[0],L=A[1];j.push(n.a.createElement(ee,{key:I,title:I,values:L,render:function(e){return n.a.createElement(ae,{value:e})}}))}}catch(N){C=!0,M=N}finally{try{x||null==D.return||D.return()}finally{if(C)throw M}}j.length&&e.push(n.a.createElement("section",{key:"lsan"},n.a.createElement("h2",null,"LSAN Failures"),n.a.createElement("p",null,j.length," directories have LSAN failures"),n.a.createElement("ul",null,j)))}return n.a.createElement("section",null,this.props.children,e.length?e:n.a.createElement("p",null,"No metadata available"))}return e=n.a.createElement("p",null,"Loading"),n.a.createElement("section",null,n.a.createElement("h2",null,"Gecko metadata"),n.a.createElement("p",null,"None"))}}]),t}(r.Component),ee=function(e){function t(){return Object(i.a)(this,t),Object(u.a)(this,Object(p.a)(t).apply(this,arguments))}return Object(h.a)(t,e),Object(c.a)(t,[{key:"render",value:function(){var e=[],t=!0,a=!1,r=void 0;try{for(var s,o=this.props.values[Symbol.iterator]();!(t=(s=o.next()).done);t=!0){var c=s.value,l=Object(d.a)(c,2),i=l[0],u=l[1],p=i?"if ".concat(i).concat(u?": ":" "):"";e.push(n.a.createElement("li",{key:i||"None"},n.a.createElement("code",null,p),u?this.props.render(u):null))}}catch(f){a=!0,r=f}finally{try{t||null==o.return||o.return()}finally{if(a)throw r}}var h=null;return e.length&&(h=n.a.createElement("ul",{className:"tree-row"},e)),n.a.createElement(q,{rowTitle:this.props.title,rowExtra:null},h)}}]),t}(r.Component),te=function(e){function t(){return Object(i.a)(this,t),Object(u.a)(this,Object(p.a)(t).apply(this,arguments))}return Object(h.a)(t,e),Object(c.a)(t,[{key:"render",value:function(){for(var e=[/https?:\/\/bugzilla\.mozilla\.org\/show_bug\.cgi\?id=(\d+)/,/(?:bug\s+)?(\d+)/i],t=0;t<e.length;t++){var a=e[t].exec(this.props.value);if(null!==a)return n.a.createElement("a",{href:"https://bugzilla.mozilla.org/show_bug.cgi?id=".concat(a[1])},"Bug ",a[1])}return this.props.value}}]),t}(r.Component),ae=function(e){function t(){return Object(i.a)(this,t),Object(u.a)(this,Object(p.a)(t).apply(this,arguments))}return Object(h.a)(t,e),Object(c.a)(t,[{key:"render",value:function(){if(Array.isArray(this.props.value)){var e=this.props.value.map(function(e){return n.a.createElement("li",{key:e},n.a.createElement("code",null,e))});return n.a.createElement("ul",null,e)}return this.props.value}}]),t}(r.Component),re=function(e){function t(e){var a;return Object(i.a)(this,t),(a=Object(u.a)(this,Object(p.a)(t).call(this,e))).handleClickTab=function(e){a.setState({activeTab:e}),R.set("tab",e)},a.state={activeTab:R.get("tab")||a.props.children[0].props.label},a}return Object(h.a)(t,e),Object(c.a)(t,[{key:"render",value:function(){var e=this,t=this.props.children.map(function(t){var a=t.props.label;return n.a.createElement(ne,{active:e.state.activeTab===a,label:a,key:a,onClick:e.handleClickTab})}),a=this.props.children.find(function(t){return t.props.label===e.state.activeTab});return n.a.createElement("div",{className:"tab-view"},n.a.createElement("ol",{className:"tab-strip"},t),n.a.createElement("div",{className:"tab-content"},a))}}]),t}(r.Component),ne=function(e){function t(){var e,a;Object(i.a)(this,t);for(var r=arguments.length,n=new Array(r),s=0;s<r;s++)n[s]=arguments[s];return(a=Object(u.a)(this,(e=Object(p.a)(t)).call.apply(e,[this].concat(n)))).onClick=function(){a.props.onClick(a.props.label)},a}return Object(h.a)(t,e),Object(c.a)(t,[{key:"render",value:function(){return n.a.createElement("li",{className:"tab-label "+(this.props.active?"tab-active":""),onClick:this.onClick},this.props.label)}}]),t}(r.Component),se=G;Boolean("localhost"===window.location.hostname||"[::1]"===window.location.hostname||window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/));o.a.render(n.a.createElement(se,null),document.getElementById("root")),"serviceWorker"in navigator&&navigator.serviceWorker.ready.then(function(e){e.unregister()})}},[[13,2,1]]]);
//# sourceMappingURL=main.e94acfc8.chunk.js.map