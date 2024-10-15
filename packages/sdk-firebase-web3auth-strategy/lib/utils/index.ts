async function check(res: (value?: unknown) => void, condition: () => boolean | Promise<boolean>) {
    if (await condition()) res()
    setTimeout(() => check(res, condition), 500)
}

export async function poll(condition: () => boolean | Promise<boolean>) {
    if (await condition()) return
    return new Promise((res) => {
        check(res, condition)
    })
}
