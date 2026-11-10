import { createClient } from "npm:@supabase/supabase-js@2.95.0";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json"}});
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 if(req.method!=="POST")return json({error:"Method not allowed"},405);
 try{
  const body=await req.json(),orderId=body?.orderId;
  if(typeof orderId!=="string"||!/^[0-9a-f-]{36}$/i.test(orderId))return json({error:"Invalid order id"},400);
  const url=Deno.env.get("SUPABASE_URL"),map=Deno.env.get("SUPABASE_SECRET_KEYS"),legacy=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),secret=map?JSON.parse(map).default:legacy,key=Deno.env.get("RESEND_API_KEY");
  if(!url||!secret)return json({error:"Server configuration incomplete"},500);
  if(!key)return json({error:"Email provider is not configured"},503);
  const admin=createClient(url,secret,{auth:{autoRefreshToken:false,persistSession:false}});
  // Claim this order atomically to prevent repeat notification requests.
  const {data:order,error}=await admin.from("orders").update({email_sent_at:new Date().toISOString()}).eq("id",orderId).is("email_sent_at",null).select("id,full_name,platform,platform_id,phone,notes,price_toman,created_at").maybeSingle();
  if(error)throw error;
  if(!order)return json({sent:false,duplicate:true});
  const text=["درخواست جدید MG_V2RAY","","نام: "+order.full_name,"پیام‌رسان: "+order.platform,"شناسه: "+order.platform_id,"موبایل: "+(order.phone||"ثبت نشده"),"توضیحات: "+(order.notes||"ندارد"),"قیمت پایه: "+order.price_toman.toLocaleString("en-US")+" تومان","زمان ثبت: "+order.created_at,"شناسه سفارش: "+order.id].join("\n");
  const response=await fetch("https://api.resend.com/emails",{method:"POST",headers:{"Authorization":"Bearer "+key,"Content-Type":"application/json"},body:JSON.stringify({from:"MG_V2RAY <onboarding@resend.dev>",to:["mahdim495mk@gmail.com"],subject:"درخواست جدید سرویس MG_V2RAY",text})});
  if(!response.ok){const detail=await response.text();await admin.from("orders").update({email_sent_at:null}).eq("id",orderId);console.error("Resend error",response.status,detail);return json({error:"Email delivery failed"},502)}
  return json({sent:true});
 }catch(err){console.error("notify-order failed",err);return json({error:"Notification failed"},500)}
});