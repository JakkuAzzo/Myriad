import Charts
import SwiftUI
import UIKit

struct ContentView: View {
    @EnvironmentObject private var model: MyriadAppState
    @State private var confirmDeleteAll = false
    @State private var confirmDeleteGoal: MyriadGoal?

    var body: some View {
        TabView {
            dashboardTab
                .tabItem {
                    Label("Dashboard", systemImage: "chart.bar.xaxis")
                }

            goalsTab
                .tabItem {
                    Label("Goals", systemImage: "target")
                }

            importTab
                .tabItem {
                    Label("Import", systemImage: "square.and.arrow.down")
                }

            settingsTab
                .tabItem {
                    Label("Settings", systemImage: "gearshape")
                }
        }
        .tint(.teal)
        .task {
            await model.bootstrap()
        }
        .alert("Myriad", isPresented: Binding(
            get: { model.errorMessage != nil },
            set: { if !$0 { model.errorMessage = nil } }
        )) {
            Button("OK", role: .cancel) {
                model.errorMessage = nil
            }
        } message: {
            Text(model.errorMessage ?? "")
        }
        .confirmationDialog("Delete local data?", isPresented: $confirmDeleteAll) {
            Button("Delete All Data", role: .destructive) {
                Task { await model.deleteAllData() }
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("This removes all locally stored events for the active user.")
        }
        .confirmationDialog("Remove this goal?", isPresented: Binding(
            get: { confirmDeleteGoal != nil },
            set: { if !$0 { confirmDeleteGoal = nil } }
        )) {
            Button("Remove Goal", role: .destructive) {
                if let goal = confirmDeleteGoal {
                    Task { await model.deleteGoal(goal) }
                }
                confirmDeleteGoal = nil
            }
            Button("Cancel", role: .cancel) {
                confirmDeleteGoal = nil
            }
        } message: {
            Text(confirmDeleteGoal.map { "Delete \($0.title)?" } ?? "Delete this goal?")
        }
    }

    private var dashboardTab: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                headerCard
                summaryControls
                chartsPanel
                insightsPanel
                breakdownPanel
                nudgePanel
            }
            .padding()
        }
        .refreshable {
            await model.refreshAll()
        }
        .safeAreaInset(edge: .top) {
            if model.isBusy {
                ProgressView("Refreshing dashboard")
                    .padding(8)
                    .frame(maxWidth: .infinity)
                    .background(.thinMaterial)
            }
        }
    }

    private var goalsTab: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                goalEditor
                goalListPanel
                planPanel
            }
            .padding()
        }
        .refreshable {
            await model.refreshGoals()
            await model.refreshDashboard()
        }
    }

    private var importTab: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                importModePicker
                importInstructions
                importEditor
                importActions
            }
            .padding()
        }
        .refreshable {
            await model.refreshDashboard()
        }
    }

    private var settingsTab: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                connectionPanel
                authPanel
                privacyPanel
                maintenancePanel
            }
            .padding()
        }
        .refreshable {
            await model.refreshAll()
        }
    }

    private var headerCard: some View {
        CardView(title: "Myriad") {
            VStack(alignment: .leading, spacing: 12) {
                Text("Goal-focused, local-first habit support across devices.")
                    .font(.title3.weight(.semibold))

                Text(model.statusMessage)
                    .foregroundStyle(.secondary)

                HStack(spacing: 12) {
                    MetricChip(label: "Events", value: model.summary?.totals?.totalEvents ?? 0)
                    MetricChip(label: "Minutes", value: model.summary?.totals?.totalMinutes ?? 0)
                    MetricChip(label: "Active days", value: model.summary?.totals?.activeDays ?? 0)
                }

                if let warning = model.health?.privacy?.warning {
                    InfoBanner(text: warning)
                }
            }
        }
    }

    private var summaryControls: some View {
        CardView(title: "Window") {
            VStack(alignment: .leading, spacing: 12) {
                Picker("Days", selection: $model.selectedDays) {
                    Text("3").tag(3)
                    Text("7").tag(7)
                    Text("14").tag(14)
                    Text("30").tag(30)
                }
                .pickerStyle(.segmented)

                Picker("Scope", selection: $model.selectedScope) {
                    Text("Personal").tag("personal")
                    Text("Global").tag("global")
                }
                .pickerStyle(.segmented)

                Picker("Device", selection: $model.selectedDevice) {
                    ForEach(deviceOptions, id: \.self) { device in
                        Text(deviceDisplayName(device)).tag(device)
                    }
                }
                .pickerStyle(.menu)

                if model.selectedScope == "global" {
                    TextField("Admin key", text: $model.adminKey)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .textFieldStyle(.roundedBorder)
                }

                Button {
                    Task { await model.refreshDashboard() }
                } label: {
                    Label("Refresh analysis", systemImage: "arrow.clockwise")
                }
                .buttonStyle(.borderedProminent)
            }
        }
    }

    private var chartsPanel: some View {
        VStack(spacing: 16) {
            CardView(title: "Activity by hour") {
                chartContainer {
                    Chart(model.summary?.activeHours ?? []) { item in
                        BarMark(
                            x: .value("Hour", item.hour),
                            y: .value("Events", item.count)
                        )
                        .foregroundStyle(.teal.gradient)
                    }
                }
            }

            CardView(title: "Categories") {
                chartContainer {
                    Chart(model.summary?.categoryUsage ?? []) { item in
                        BarMark(
                            x: .value("Category", item.category),
                            y: .value("Minutes", item.minutes)
                        )
                        .foregroundStyle(.orange.gradient)
                    }
                }
            }

            CardView(title: "Sentiment") {
                chartContainer {
                    Chart(model.summary?.sentimentTrend ?? []) { item in
                        LineMark(
                            x: .value("Date", item.date),
                            y: .value("Average sentiment", item.avgSentiment ?? 0)
                        )
                        .foregroundStyle(.indigo)
                    }
                }
            }
        }
    }

    private var insightsPanel: some View {
        CardView(title: "Enhanced insight") {
            VStack(alignment: .leading, spacing: 12) {
                Text(model.enhancedSummary?.aiSummary?.narrative ?? "No narrative available yet.")
                    .foregroundStyle(.primary)

                if let highlights = model.enhancedSummary?.aiSummary?.highlights, !highlights.isEmpty {
                    VStack(alignment: .leading, spacing: 8) {
                        ForEach(highlights, id: \.self) { highlight in
                            Label(highlight, systemImage: "sparkles")
                        }
                    }
                }

                if let warnings = model.enhancedSummary?.aiSummary?.warnings, !warnings.isEmpty {
                    VStack(alignment: .leading, spacing: 8) {
                        ForEach(warnings, id: \.self) { warning in
                            InfoBanner(text: warning)
                        }
                    }
                }
            }
        }
    }

    private var breakdownPanel: some View {
        VStack(spacing: 16) {
            CardView(title: "Multi-device view") {
                let deviceRows = (model.summary?.deviceBreakdown ?? []).map { item in
                    let deviceName = item.device ?? "unknown"
                    return "\(deviceName): \(item.events) events, \(item.minutes) minutes"
                }

                breakdownList(rows: deviceRows, emptyText: "No device data yet.")
                Divider().padding(.vertical, 8)

                let platformRows = (model.summary?.platformBreakdown ?? []).map { item in
                    let platformName = item.platform ?? "unknown"
                    return "\(platformName): \(item.events) events, \(item.minutes) minutes"
                }

                breakdownList(rows: platformRows, emptyText: "No platform data yet.")
            }

            CardView(title: "Recent topic focus") {
                breakdownList(rows: model.summary?.topTopics?.compactMap { bucket in
                    guard let topic = bucket.topic else { return nil }
                    return "\(topic): \(bucket.count)"
                } ?? [], emptyText: "No topic data yet.")
            }
        }
    }

    private var nudgePanel: some View {
        CardView(title: "Intervention nudges") {
            VStack(alignment: .leading, spacing: 12) {
                if let plan = model.plan?.interventions, !plan.isEmpty {
                    ForEach(Array(plan.prefix(3))) { intervention in
                        VStack(alignment: .leading, spacing: 6) {
                            HStack {
                                Text(intervention.goalTitle ?? "Goal")
                                    .font(.headline)
                                Spacer()
                                RiskBadge(level: intervention.riskLevel ?? "low")
                            }

                            if let actions = intervention.actions, !actions.isEmpty {
                                ForEach(Array(actions.prefix(2)), id: \.self) { action in
                                    Text("• \(action)")
                                        .foregroundStyle(.secondary)
                                }
                            }
                        }
                        .padding(.vertical, 4)
                    }
                } else {
                    Text("Add a goal to generate intervention prompts.")
                        .foregroundStyle(.secondary)
                }
            }
        }
    }

    private var goalEditor: some View {
        CardView(title: "New goal") {
            VStack(alignment: .leading, spacing: 12) {
                TextField("Goal title", text: $model.newGoalTitle)
                    .textFieldStyle(.roundedBorder)

                TextField("Category", text: $model.newGoalCategory)
                    .textFieldStyle(.roundedBorder)

                Picker("Device", selection: $model.newGoalDevice) {
                    Text("All devices").tag("all")
                    Text("Phone").tag("phone")
                    Text("Laptop").tag("laptop")
                    Text("Tablet").tag("tablet")
                    Text("Workstation").tag("workstation")
                }
                .pickerStyle(.menu)

                VStack(alignment: .leading, spacing: 6) {
                    Text("Max daily minutes: \(Int(model.newGoalLimit))")
                    Slider(value: $model.newGoalLimit, in: 5...240, step: 5)
                }

                TextField("Intervention plan", text: $model.newGoalPlan, axis: .vertical)
                    .textFieldStyle(.roundedBorder)

                Button {
                    Task { await model.saveGoal() }
                } label: {
                    Label("Save goal", systemImage: "plus.circle.fill")
                }
                .buttonStyle(.borderedProminent)
            }
        }
    }

    private var goalListPanel: some View {
        CardView(title: "Active goals") {
            VStack(alignment: .leading, spacing: 12) {
                if model.goals.isEmpty {
                    Text("No goals yet. Add one to start behavior-change tracking.")
                        .foregroundStyle(.secondary)
                } else {
                    ForEach(model.goals) { goal in
                        VStack(alignment: .leading, spacing: 8) {
                            HStack {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(goal.title)
                                        .font(.headline)
                                    let scopeLabel = goal.device == "all" ? "all devices" : goal.device
                                    Text("\(goal.category) on \(scopeLabel)")
                                        .foregroundStyle(.secondary)
                                }
                                Spacer()
                                Button(role: .destructive) {
                                    confirmDeleteGoal = goal
                                } label: {
                                    Image(systemName: "trash")
                                }
                                .buttonStyle(.borderless)
                            }

                            if let plan = goal.interventionPlan, !plan.isEmpty {
                                Text(plan)
                                    .foregroundStyle(.secondary)
                            }

                            if let progress = model.plan?.goalProgress?.first(where: { $0.goal.id == goal.id }) {
                                HStack {
                                    RiskBadge(level: progress.status ?? "on-track")
                                    Text(String(format: "%.1f%% of limit", progress.percentToLimit ?? 0))
                                        .foregroundStyle(.secondary)
                                    Spacer()
                                    Text(String(format: "%.1f min/day", progress.avgDailyMinutes ?? 0))
                                }
                            }
                        }
                        .padding()
                        .background(Color(.secondarySystemBackground))
                        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                    }
                }
            }
        }
    }

    private var planPanel: some View {
        CardView(title: "Intervention plan") {
            VStack(alignment: .leading, spacing: 12) {
                if let interventions = model.plan?.interventions, !interventions.isEmpty {
                    ForEach(interventions) { intervention in
                        VStack(alignment: .leading, spacing: 8) {
                            HStack {
                                Text(intervention.goalTitle ?? "Goal")
                                    .font(.headline)
                                Spacer()
                                RiskBadge(level: intervention.riskLevel ?? "low")
                            }

                            if let details = intervention.riskDetails {
                                Text("Risk score \(details.overallScore ?? 0) - \(details.relapseRiskLevel ?? "unknown")")
                                    .foregroundStyle(.secondary)
                            }

                            ForEach(intervention.actions ?? [], id: \.self) { action in
                                Text("• \(action)")
                            }
                        }
                        .padding()
                        .background(Color(.tertiarySystemBackground))
                        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                    }
                } else {
                    Text("No interventions yet. The app will generate them once goals are added.")
                        .foregroundStyle(.secondary)
                }
            }
        }
    }

    private var importModePicker: some View {
        CardView(title: "Import source") {
            Picker("Import mode", selection: $model.selectedImportMode) {
                Text("Browser history").tag("browser")
                Text("WhatsApp").tag("whatsapp")
                Text("Telegram").tag("telegram")
            }
            .pickerStyle(.segmented)
        }
    }

    private var importInstructions: some View {
        CardView(title: "How this works") {
            VStack(alignment: .leading, spacing: 8) {
                Text("Paste raw export text or JSON below, then send it to the same backend the web app uses.")
                Text("This keeps the iPhone app aligned with the desktop app's privacy and behavior-tracking pipeline.")
                    .foregroundStyle(.secondary)
            }
        }
    }

    private var importEditor: some View {
        CardView(title: "Payload") {
            VStack(alignment: .leading, spacing: 12) {
                if model.selectedImportMode == "browser" {
                    Picker("Device", selection: $model.browserDevice) {
                        Text("Phone").tag("phone")
                        Text("Laptop").tag("laptop")
                        Text("Tablet").tag("tablet")
                        Text("Workstation").tag("workstation")
                    }
                    .pickerStyle(.menu)
                }

                TextEditor(text: $model.importText)
                    .frame(minHeight: 180)
                    .padding(8)
                    .background(Color(.secondarySystemBackground))
                    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
            }
        }
    }

    private var importActions: some View {
        CardView(title: "Actions") {
            VStack(alignment: .leading, spacing: 12) {
                Button {
                    Task { await model.importCurrentPayload() }
                } label: {
                    Label("Import data", systemImage: "square.and.arrow.down.on.square")
                }
                .buttonStyle(.borderedProminent)

                Button {
                    Task { await model.seedDemoData() }
                } label: {
                    Label("Load demo events", systemImage: "wand.and.stars")
                }
                .buttonStyle(.bordered)
            }
        }
    }

    private var connectionPanel: some View {
        CardView(title: "Connection") {
            VStack(alignment: .leading, spacing: 12) {
                TextField("API base URL", text: $model.baseURLString)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                    .textFieldStyle(.roundedBorder)

                Text("Default local target: http://127.0.0.1:3000")
                    .font(.footnote)
                    .foregroundStyle(.secondary)

                HStack {
                    Button {
                        Task { await model.refreshAll() }
                    } label: {
                        Label("Reconnect", systemImage: "arrow.clockwise")
                    }
                    .buttonStyle(.borderedProminent)

                    Button {
                        Task { await model.exportData() }
                    } label: {
                        Label("Prepare export", systemImage: "square.and.arrow.up")
                    }
                    .buttonStyle(.bordered)
                }

                if let exportJSON = model.exportJSON {
                    let previewText = String(exportJSON.prefix(200)) + (exportJSON.count > 200 ? "..." : "")

                    VStack(alignment: .leading, spacing: 8) {
                        Text("Export ready")
                            .font(.headline)
                        Text(previewText)
                            .font(.footnote.monospaced())
                            .foregroundStyle(.secondary)
                        Button {
                            UIPasteboard.general.string = exportJSON
                            model.statusMessage = "Export copied to clipboard."
                        } label: {
                            Label("Copy export", systemImage: "doc.on.doc")
                        }
                        .buttonStyle(.bordered)
                    }
                }
            }
        }
    }

    private var authPanel: some View {
        CardView(title: "Account") {
            VStack(alignment: .leading, spacing: 12) {
                Text("Signed in as: \(model.currentUser?.username ?? "local")")
                    .font(.headline)

                TextField("Username", text: $model.authUsername)
                    .textFieldStyle(.roundedBorder)

                SecureField("Password", text: $model.authPassword)
                    .textFieldStyle(.roundedBorder)

                HStack {
                    Button {
                        Task { await model.login() }
                    } label: {
                        Label("Login", systemImage: "person.crop.circle.badge.checkmark")
                    }
                    .buttonStyle(.borderedProminent)

                    Button {
                        Task { await model.register() }
                    } label: {
                        Label("Register", systemImage: "person.badge.plus")
                    }
                    .buttonStyle(.bordered)

                    Button(role: .destructive) {
                        Task { await model.signOut() }
                    } label: {
                        Label("Sign out", systemImage: "rectangle.portrait.and.arrow.right")
                    }
                    .buttonStyle(.bordered)
                }
            }
        }
    }

    private var privacyPanel: some View {
        CardView(title: "Privacy") {
            VStack(alignment: .leading, spacing: 12) {
                Toggle("Allow collection", isOn: Binding(
                    get: { model.consentEnabled },
                    set: { newValue in
                        Task { await model.setConsent(newValue) }
                    }
                ))

                if let privacy = model.health?.privacy {
                    Text("Strict mode: \(privacy.strictMode == true ? "on" : "off")")
                    Text("Default salt in use: \(privacy.usingDefaultSalt == true ? "yes" : "no")")
                        .foregroundStyle(privacy.usingDefaultSalt == true ? .red : .secondary)
                }

                Button {
                    Task { await model.requestNotificationPermission() }
                } label: {
                    Label("Enable nudge notifications", systemImage: "bell.badge")
                }
                .buttonStyle(.borderedProminent)
            }
        }
    }

    private var maintenancePanel: some View {
        CardView(title: "Maintenance") {
            VStack(alignment: .leading, spacing: 12) {
                Picker("Unknown device target", selection: $model.reassignDevice) {
                    Text("Phone").tag("phone")
                    Text("Laptop").tag("laptop")
                    Text("Tablet").tag("tablet")
                    Text("Workstation").tag("workstation")
                }
                .pickerStyle(.menu)

                HStack {
                    Button {
                        Task { await model.reassignUnknownEvents() }
                    } label: {
                        Label("Reassign unknown events", systemImage: "arrow.triangle.2.circlepath")
                    }
                    .buttonStyle(.bordered)

                    Button(role: .destructive) {
                        confirmDeleteAll = true
                    } label: {
                        Label("Delete all data", systemImage: "trash")
                    }
                    .buttonStyle(.bordered)
                }
            }
        }
    }

    private var deviceOptions: [String] {
        let devices = model.summary?.deviceBreakdown?.compactMap { $0.device }.filter { !$0.isEmpty } ?? []
        return ["all"] + Array(Set(devices)).sorted()
    }

    private func deviceDisplayName(_ device: String) -> String {
        device == "all" ? "All devices" : device.capitalized
    }

    @ViewBuilder
    private func breakdownList(rows: [String], emptyText: String) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            if rows.isEmpty {
                Text(emptyText)
                    .foregroundStyle(.secondary)
            } else {
                ForEach(rows, id: \.self) { row in
                    Text("• \(row)")
                        .foregroundStyle(.primary)
                }
            }
        }
    }

    @ViewBuilder
    private func chartContainer<Content: View>(@ViewBuilder content: () -> Content) -> some View {
        content()
            .frame(height: 180)
    }
}

private struct CardView<Content: View>: View {
    let title: String
    @ViewBuilder let content: () -> Content

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(title)
                .font(.headline)
                .foregroundStyle(.secondary)

            content()
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            LinearGradient(
                colors: [Color(.secondarySystemBackground), Color(.tertiarySystemBackground)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
        .overlay(
            RoundedRectangle(cornerRadius: 24, style: .continuous)
                .strokeBorder(Color.teal.opacity(0.12), lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
    }
}

private struct MetricChip: View {
    let label: String
    let value: Int

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label.uppercased())
                .font(.caption.weight(.semibold))
                .foregroundStyle(.secondary)
            Text("\(value)")
                .font(.title2.weight(.bold))
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.teal.opacity(0.10))
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
    }
}

private struct InfoBanner: View {
    let text: String

    var body: some View {
        HStack(alignment: .top, spacing: 8) {
            Image(systemName: "exclamationmark.triangle.fill")
            Text(text)
        }
        .font(.footnote.weight(.medium))
        .foregroundStyle(.white)
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.orange.gradient)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
    }
}

private struct RiskBadge: View {
    let level: String

    var body: some View {
        Text(level.uppercased())
            .font(.caption.weight(.bold))
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .background(backgroundColor)
            .foregroundStyle(.white)
            .clipShape(Capsule())
    }

    private var backgroundColor: Color {
        switch level.lowercased() {
        case "critical": return .red
        case "high", "off-track": return .orange
        case "moderate", "at-risk": return .yellow
        default: return .green
        }
    }
}

#Preview {
    ContentView()
        .environmentObject(MyriadAppState())
}
