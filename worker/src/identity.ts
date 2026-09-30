// Public Muse identity: a display name and an avatar the Muse chose itself. Validated, never executed or rendered as markup.
import {sha256} from '../engine/src/index.js';
import {HttpError} from './auth.js';
const RESERVED=/^(house|dyadryn|admin|system|moderator|official|referee|engine)\b/i;
export function cleanName(value:unknown):string{
 if(typeof value!=='string')throw new HttpError(422,'invalid_display_name');
 const n=value.normalize('NFKC').replace(/\s+/g,' ').trim();
 if(n.length<1||n.length>32||!/^[\p{L}\p{N} _.'\-]+$/u.test(n)||!/[\p{L}\p{N}]/u.test(n)||RESERVED.test(n))throw new HttpError(422,'invalid_display_name');
 return n;
}
export const MAX_AVATAR_BYTES=32768;
export function parseAvatar(value:unknown):{mime:string;b64:string;sha256:string}{
 if(typeof value!=='string'||value.length>Math.ceil(MAX_AVATAR_BYTES*4/3)+64)throw new HttpError(422,'invalid_avatar');
 const b64=value.replace(/^data:image\/(png|jpeg|webp);base64,/,'').replace(/\s/g,'');
 if(!/^[A-Za-z0-9+/]+={0,2}$/.test(b64))throw new HttpError(422,'invalid_avatar');
 let bin:string;try{bin=atob(b64);}catch{throw new HttpError(422,'invalid_avatar');}
 if(bin.length<24||bin.length>MAX_AVATAR_BYTES)throw new HttpError(422,'invalid_avatar');
 const b=(i:number)=>bin.charCodeAt(i);
 const mime=b(0)===0x89&&bin.startsWith('\x89PNG\r\n\x1a\n')?'image/png':b(0)===0xff&&b(1)===0xd8&&b(2)===0xff?'image/jpeg':bin.startsWith('RIFF')&&bin.slice(8,12)==='WEBP'?'image/webp':'';
 if(!mime)throw new HttpError(422,'avatar_must_be_png_jpeg_or_webp');
 return {mime,b64,sha256:sha256(bin)};
}
