import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
const here=path.dirname(fileURLToPath(import.meta.url));
export function getReleaseVersion(){
  try{
    const status=JSON.parse(fs.readFileSync(path.join(here,'RELEASE_STATUS_BUILD40.json'),'utf8'));
    const rc=Number(status?.rc);
    return {build:status?.build||'BUILD-40',rc:Number.isInteger(rc)&&rc>0?rc:null,currentLocalIntegratedVersion:status?.currentLocalIntegratedVersion||null};
  }catch{return {build:'BUILD-40',rc:null,currentLocalIntegratedVersion:null}}
}
