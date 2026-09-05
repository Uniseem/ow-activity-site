import { Prisma } from "../../src/generated/prisma/client";
import { prisma } from "../../src/lib/prisma";
import { saveArticle } from "../../src/lib/article-service";
import { storeSiteAsset, readSiteAsset } from "../../src/lib/asset-storage";
import type { SiteCloudflareEnv } from "../../src/lib/cloudflare";

export default {
  async fetch(_request: Request, env: SiteCloudflareEnv) {
    // This worker is only launched with the isolated tests/cloudflare config.
    // It never uses the app's production binding or PostgreSQL connection.
    process.env.DATABASE_PROVIDER="d1";
    Object.defineProperty(globalThis,Symbol.for("__cloudflare-context__"),{configurable:true,value:{env}});
    const checks:string[]=[];
    const assert=(value:unknown,name:string)=>{if(!value)throw new Error(name);checks.push(name);};
    const id="c"+crypto.randomUUID().replaceAll("-","").slice(0,24);
    try {
      const user=await prisma.user.create({data:{id,username:id,role:"ADMIN",status:"APPROVED"}});
      assert(user.createdAt instanceof Date,"DateTime 返回 Date");
      const profile=await prisma.profile.create({data:{userId:id,displayName:"测试玩家",slogan:"测试",mainHeroes:["安娜","D.Va"]}});
      assert(Array.isArray(profile.mainHeroes)&&profile.mainHeroes[0]==="安娜","JSON 英雄数组读写");
      const found=await prisma.user.findMany({where:{username:{contains:id.slice(0,8),mode:"insensitive"}},include:{profile:true}});
      assert(found[0]?.profile?.mainHeroes.length===2,"关联查询和 PostgreSQL mode 兼容");
      await prisma.siteSettings.upsert({where:{id:"site"},create:{id:"site",values:{mode:"retain-json-key",name:"测试"}},update:{values:{mode:"retain-json-key",name:"测试"}}});
      const settings=await prisma.siteSettings.findUnique({where:{id:"site"}});
      assert((settings?.values as {mode:string}).mode==="retain-json-key","站点 JSON 配置不被改写");
      await prisma.updateSettings.upsert({where:{id:"global"},create:{id:"global"},update:{checkResult:{ok:true}}});
      await prisma.updateSettings.update({where:{id:"global"},data:{checkResult:Prisma.DbNull,checkLease:null}});
      const lease=await prisma.updateSettings.updateMany({where:{id:"global",OR:[{checkLeaseUntil:null},{checkLeaseUntil:{lte:new Date()}}]},data:{checkLease:id,checkLeaseUntil:new Date(Date.now()+60000)}});
      assert(lease.count===1,"DbNull 和更新检查租约条件");
      const nullResult=await prisma.updateSettings.findUnique({where:{id:"global"}});
      assert(nullResult?.checkResult===null,"DbNull 写入 SQL NULL");
      const article=await saveArticle(prisma,{id,role:"ADMIN",status:"APPROVED"},{id:crypto.randomUUID(),revision:0,title:"文章",excerpt:"",coverUrl:"",content:"正文",status:"PUBLISHED"});
      assert(article.status==="PUBLISHED","文章创建和发布");
      const asset=await storeSiteAsset({data:new Uint8Array([1,2,3]),name:"test.png",mimeType:"image/png",uploadedById:id});
      const loaded=await readSiteAsset(asset.id);
      assert(loaded?.data[2]===3,"R2 图片上传和读取");
      let refused=false;
      try{await prisma.$transaction([]);}catch{refused=true;}
      assert(refused,"拒绝不具备原子性的 Prisma transaction");
      return Response.json({ok:true,checks});
    } catch(error){
      console.error(error);
      return Response.json({ok:false,checks,error:error instanceof Error?error.message:String(error)},{status:500});
    }
  },
};
