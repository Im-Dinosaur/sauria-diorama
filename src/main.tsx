import React, { Component, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
const App=lazy(()=>import('./EcosystemApp'));
import './ecosystem.css';
import './reference.css';
const DinosaurStudio=lazy(()=>import('./DinosaurStudio'));
const TyrannosaurusStudy=lazy(()=>import('./TyrannosaurusStudy'));
const RealisticDinosaurStudio=lazy(()=>import('./RealisticDinosaurStudio'));
class Boundary extends Component<{children:React.ReactNode},{error:boolean}> {
 state={error:false}; static getDerivedStateFromError(){return {error:true};}
 componentDidCatch(error:Error){console.error(error);document.getElementById('boot')?.remove();}
 render(){return this.state.error ? <div className="error"><h1>잠시 장면을 불러오지 못했어요.</h1><p>WebGL을 지원하는 브라우저에서 다시 시도해 주세요.</p><button onClick={()=>location.reload()}>다시 불러오기</button></div>:this.props.children;}
}
const root:Root=import.meta.hot?.data.root??createRoot(document.getElementById('root')!);
if(import.meta.hot)import.meta.hot.data.root=root;
const query=new URLSearchParams(location.search);
root.render(<Boundary><Suspense fallback={null}>{query.has('specimen')||query.get('models')==='realistic'?<RealisticDinosaurStudio/>:query.has('trex')||(query.get('studio')==='rex'&&!query.has('legacy'))?<TyrannosaurusStudy/>:query.has('studio')?<DinosaurStudio/>:<App/>}</Suspense></Boundary>);
