/**
 * Simple performance tracer for measuring the time taken by different parts of the code.
 *
 * ```ts
 * import { tracer } from "@happy.tech/common"
 *
 * tracer.track('first-event')
 * // do some work
 *tracer.track('second-event')
 * // do some more work
 * tracer.track('third-event')
 *
 * tracer.results() // console.logs the results and time taken in between events to diagnose bottlenecks
 * ```
 */
export class Tracer {
    events: PerformanceMark[] = []
    track(name: string, options: PerformanceMarkOptions["detail"]) {
        const time = performance.mark(name, { detail: options })
        this.events.push(time)
    }
    clear() {
        this.events = []
    }
    results() {
        // the should be sorted, but may not be. cache snapshot locally.
        const sortedEvents = this.events.toSorted((a, b) => a.startTime - b.startTime)

        const table = []
        for (let i = 0; i < sortedEvents.length - 1; i++) {
            table.push(this.#formatRow(sortedEvents[i], sortedEvents[i + 1]))
        }
        console.table(table)

        // show total
        console.log(
            performance.measure("tracer-results", sortedEvents[0].name, sortedEvents[sortedEvents.length - 1].name),
        )
    }

    #formatRow(start: PerformanceMark, end: PerformanceMark) {
        const m = performance.measure("tracer-results", start.name, end.name)
        return { Start: start.name, End: end.name, "Duration (ms)": m.duration }
    }
}

export const tracer = new Tracer()
