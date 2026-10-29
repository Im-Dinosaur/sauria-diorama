/** Keep runtime-loaded files inside the deployed project directory. */
export function publicAsset(path:string){return `${import.meta.env.BASE_URL}${path.replace(/^\//,'')}`;}
