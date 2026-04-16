import EventKit
import Foundation

// Args: startDateISO endDateISO (YYYY-MM-DD)
let args = CommandLine.arguments
guard args.count >= 3 else {
    fputs("Usage: fetch-calendar <startDate> <endDate>\n", stderr)
    exit(1)
}

let formatter = DateFormatter()
formatter.dateFormat = "yyyy-MM-dd"
formatter.timeZone = TimeZone.current

guard let startDay = formatter.date(from: args[1]),
      let endDay   = formatter.date(from: args[2]) else {
    fputs("Invalid date format\n", stderr)
    exit(1)
}

// Expand to full day range
var cal = Calendar.current
let startDate = cal.startOfDay(for: startDay)
var comps = DateComponents(); comps.day = 1; comps.second = -1
let endDate = cal.date(byAdding: comps, to: cal.startOfDay(for: endDay))!

let store = EKEventStore()
let sem   = DispatchSemaphore(value: 0)

store.requestFullAccessToEvents { granted, error in
    guard granted else {
        fputs("Calendar access denied: \(error?.localizedDescription ?? "unknown")\n", stderr)
        sem.signal()
        return
    }

    let predicate = store.predicateForEvents(withStart: startDate, end: endDate, calendars: nil)
    let events    = store.events(matching: predicate)

    let outFmt = DateFormatter()
    outFmt.dateFormat = "HH:mm"
    outFmt.timeZone   = TimeZone.current

    let dayFmt = DateFormatter()
    dayFmt.dateFormat = "yyyy-MM-dd"
    dayFmt.timeZone   = TimeZone.current

    for event in events {
        guard !event.isAllDay else { continue }
        let title    = event.title ?? ""
        let dateStr  = dayFmt.string(from: event.startDate)
        let timeStr  = outFmt.string(from: event.startDate)
        let url      = event.url?.absoluteString ?? ""
        let calName  = event.calendar?.title ?? ""
        print("\(title)|\(dateStr)|\(timeStr)|\(url)|\(calName)")
    }

    sem.signal()
}

sem.wait()
