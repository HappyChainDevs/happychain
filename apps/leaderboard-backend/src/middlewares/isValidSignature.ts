import { createMiddleware } from "hono/factory"

const isValidSignature = createMiddleware(async (c, next) => {
    console.log(c.req)
    console.log("TODO: import wagmi, make call to SCA.isValidSignature()")
    await next()
    // !Optional, modify response after it comes back from the handler
    // c.res = undefined
    // c.res = new Response('New Response')
})

export { isValidSignature }
