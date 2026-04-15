import SwiftUI

@main
struct MyriadIOSApp: App {
    @StateObject private var model = MyriadAppState()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(model)
        }
    }
}
