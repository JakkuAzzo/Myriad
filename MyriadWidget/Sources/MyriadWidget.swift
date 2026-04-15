import WidgetKit
import SwiftUI

struct MyriadWidgetEntry: TimelineEntry {
    let date: Date
    let message: String
}

struct MyriadWidgetProvider: TimelineProvider {
    func placeholder(in context: Context) -> MyriadWidgetEntry {
        MyriadWidgetEntry(date: Date(), message: "Stay on track today")
    }

    func getSnapshot(in context: Context, completion: @escaping (MyriadWidgetEntry) -> Void) {
        completion(MyriadWidgetEntry(date: Date(), message: "Small wins add up"))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<MyriadWidgetEntry>) -> Void) {
        let now = Date()
        let entries = [
            MyriadWidgetEntry(date: now, message: "Keep your streak going"),
            MyriadWidgetEntry(date: now.addingTimeInterval(60 * 60), message: "Take a mindful break")
        ]
        completion(Timeline(entries: entries, policy: .atEnd))
    }
}

struct MyriadWidgetView: View {
    var entry: MyriadWidgetProvider.Entry

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Myriad")
                .font(.headline)
            Text(entry.message)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .padding()
        .containerBackground(.background, for: .widget)
    }
}

struct QuickStatusWidget: Widget {
    let kind = "QuickStatusWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: MyriadWidgetProvider()) { entry in
            MyriadWidgetView(entry: entry)
        }
        .configurationDisplayName("Myriad Check-in")
        .description("Quick habit focus reminder and momentum prompt.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

@main
struct MyriadWidgetBundle: WidgetBundle {
    var body: some Widget {
        QuickStatusWidget()
    }
}
