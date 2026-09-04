import worker from "../../cloudflare-lite/src/worker";

type PagesContext = {
  request: Request;
  env: Parameters<typeof worker.fetch>[1];
};

export const onRequest = (context: PagesContext) =>
  worker.fetch(context.request, context.env);
