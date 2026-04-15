import SwiftUI

struct ContentView: View {
    var body: some View {
        VStack(spacing: 12) {
            Text("Myriad")
                .font(.largeTitle)
                .fontWeight(.bold)
            Text("Privacy-first mindful habit tracking")
                .multilineTextAlignment(.center)
                .foregroundStyle(.secondary)
            Text("Daily streak ready")
                .padding(.horizontal, 14)
                .padding(.vertical, 8)
                .background(.blue.opacity(0.15))
                .clipShape(Capsule())
        }
        .padding()
        .accessibilityIdentifier("home.screen")
    }
}

#Preview {
    ContentView()
}
