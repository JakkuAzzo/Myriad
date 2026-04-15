import Foundation
import UserNotifications

@MainActor
final class MyriadAppState: ObservableObject {
    @Published var baseURLString: String {
        didSet { UserDefaults.standard.set(baseURLString, forKey: Self.baseURLKey) }
    }

    @Published var token: String? {
        didSet {
            if let token {
                UserDefaults.standard.set(token, forKey: Self.tokenKey)
            } else {
                UserDefaults.standard.removeObject(forKey: Self.tokenKey)
            }
        }
    }

    @Published var currentUser: MyriadUser?
    @Published var health: MyriadHealthResponse?
    @Published var consentEnabled: Bool = true
    @Published var selectedDays: Int {
        didSet { UserDefaults.standard.set(selectedDays, forKey: Self.daysKey) }
    }

    @Published var selectedDevice: String {
        didSet { UserDefaults.standard.set(selectedDevice, forKey: Self.deviceKey) }
    }

    @Published var selectedScope: String {
        didSet { UserDefaults.standard.set(selectedScope, forKey: Self.scopeKey) }
    }

    @Published var adminKey: String {
        didSet { UserDefaults.standard.set(adminKey, forKey: Self.adminKeyKey) }
    }

    @Published var summary: MyriadSummaryResponse?
    @Published var enhancedSummary: MyriadEnhancedSummaryResponse?
    @Published var goals: [MyriadGoal] = []
    @Published var plan: MyriadPlanResponse?
    @Published var selectedImportMode: String {
        didSet { UserDefaults.standard.set(selectedImportMode, forKey: Self.importModeKey) }
    }

    @Published var importText: String = ""
    @Published var browserDevice: String = "phone"
    @Published var authUsername: String = ""
    @Published var authPassword: String = ""
    @Published var newGoalTitle: String = ""
    @Published var newGoalCategory: String = ""
    @Published var newGoalDevice: String = "all"
    @Published var newGoalLimit: Double = 45
    @Published var newGoalPlan: String = ""
    @Published var reassignDevice: String = "phone"
    @Published var exportJSON: String?
    @Published var statusMessage: String = "Ready"
    @Published var errorMessage: String?
    @Published var isBusy = false

    private let notificationCenter = UNUserNotificationCenter.current()

    private static let baseURLKey = "myriadBaseURL"
    private static let tokenKey = "myriadAuthToken"
    private static let daysKey = "myriadSelectedDays"
    private static let deviceKey = "myriadSelectedDevice"
    private static let scopeKey = "myriadSelectedScope"
    private static let adminKeyKey = "myriadAdminKey"
    private static let importModeKey = "myriadImportMode"

    init() {
        let defaults = UserDefaults.standard
        let loadedDays = defaults.integer(forKey: Self.daysKey)
        let resolvedDays = loadedDays == 0 ? 7 : loadedDays

        baseURLString = defaults.string(forKey: Self.baseURLKey) ?? "http://127.0.0.1:3000"
        token = defaults.string(forKey: Self.tokenKey)
        selectedDays = resolvedDays
        selectedDevice = defaults.string(forKey: Self.deviceKey) ?? "all"
        selectedScope = defaults.string(forKey: Self.scopeKey) ?? "personal"
        adminKey = defaults.string(forKey: Self.adminKeyKey) ?? ""
        selectedImportMode = defaults.string(forKey: Self.importModeKey) ?? "browser"
    }

    var apiClient: MyriadAPIClient? {
        guard let baseURL = normalizedBaseURL else {
            return nil
        }
        return MyriadAPIClient(baseURL: baseURL, token: token)
    }

    var normalizedBaseURL: URL? {
        let trimmed = baseURLString.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else {
            return nil
        }

        let candidate = trimmed.contains("://") ? trimmed : "http://\(trimmed)"
        return URL(string: candidate)
    }

    func bootstrap() async {
        await refreshAll()
    }

    func refreshAll() async {
        await loadHealthAndIdentity()
        await refreshDashboard()
        await refreshGoals()
    }

    func refreshDashboard() async {
        guard let client = apiClient else {
            errorMessage = MyriadAPIError.invalidBaseURL.localizedDescription
            return
        }

        isBusy = true
        defer { isBusy = false }

        do {
            async let summaryResponse = client.summary(days: selectedDays, device: selectedDevice, scope: selectedScope, adminKey: adminKey)
            async let enhancedResponse = client.enhancedSummary(days: selectedDays, device: selectedDevice, scope: selectedScope, adminKey: adminKey)
            async let planResponse = client.habitPlan(days: selectedDays)

            summary = try await summaryResponse
            enhancedSummary = try await enhancedResponse
            plan = try await planResponse
            statusMessage = buildStatusMessage()

            await scheduleNudgesIfNeeded()
        } catch {
            if handleConnectivityFailure(error) {
                return
            }
            errorMessage = error.localizedDescription
        }
    }

    func refreshGoals() async {
        guard let client = apiClient else {
            return
        }

        do {
            let response = try await client.goals()
            goals = response.goals
        } catch {
            if handleConnectivityFailure(error) {
                return
            }
            errorMessage = error.localizedDescription
        }
    }

    func loadHealthAndIdentity() async {
        guard let client = apiClient else {
            errorMessage = MyriadAPIError.invalidBaseURL.localizedDescription
            return
        }

        do {
            async let healthResponse = client.health()
            async let identityResponse = client.me()
            async let consentResponse = client.consent()

            health = try await healthResponse
            currentUser = try await identityResponse.user
            consentEnabled = try await consentResponse.enabled

            if let warning = health?.privacy?.warning {
                statusMessage = warning
            }
        } catch {
            if handleConnectivityFailure(error) {
                return
            }
            errorMessage = error.localizedDescription
        }
    }

    func saveGoal() async {
        guard let client = apiClient else {
            errorMessage = MyriadAPIError.invalidBaseURL.localizedDescription
            return
        }

        let payload = MyriadGoalPayload(
            title: newGoalTitle.trimmingCharacters(in: .whitespacesAndNewlines),
            category: newGoalCategory.trimmingCharacters(in: .whitespacesAndNewlines),
            device: newGoalDevice,
            maxDailyMinutes: Int(newGoalLimit),
            interventionPlan: newGoalPlan.trimmingCharacters(in: .whitespacesAndNewlines),
            active: true
        )

        do {
            let goal = try await client.saveGoal(payload: payload)
            goals.insert(goal, at: 0)
            newGoalTitle = ""
            newGoalCategory = ""
            newGoalPlan = ""
            statusMessage = "Goal saved."
            await refreshDashboard()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func deleteGoal(_ goal: MyriadGoal) async {
        guard let client = apiClient else {
            errorMessage = MyriadAPIError.invalidBaseURL.localizedDescription
            return
        }

        do {
            try await client.deleteGoal(id: goal.id)
            goals.removeAll { $0.id == goal.id }
            statusMessage = "Goal removed."
            await refreshDashboard()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func setConsent(_ enabled: Bool) async {
        guard let client = apiClient else {
            errorMessage = MyriadAPIError.invalidBaseURL.localizedDescription
            return
        }

        do {
            let response = try await client.setConsent(enabled: enabled)
            consentEnabled = response.enabled
            statusMessage = enabled ? "Collection enabled." : "Collection paused."
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func importCurrentPayload() async {
        guard let client = apiClient else {
            errorMessage = MyriadAPIError.invalidBaseURL.localizedDescription
            return
        }

        do {
            let result: MyriadImportResponse
            switch selectedImportMode {
            case "whatsapp":
                result = try await client.importWhatsApp(text: importText)
            case "telegram":
                result = try await client.importTelegram(json: importText)
            default:
                result = try await client.importBrowserHistory(text: importText, device: browserDevice)
            }

            let imported = result.imported ?? 0
            statusMessage = "Imported \(imported) events from \(result.connector ?? selectedImportMode)."
            importText = ""
            await refreshDashboard()
            await refreshGoals()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func seedDemoData() async {
        guard let client = apiClient else {
            errorMessage = MyriadAPIError.invalidBaseURL.localizedDescription
            return
        }

        do {
            let result = try await client.seedDemoData()
            statusMessage = "Seeded \(result.seeded ?? 0) demo events."
            await refreshDashboard()
            await refreshGoals()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func reassignUnknownEvents() async {
        guard let client = apiClient else {
            errorMessage = MyriadAPIError.invalidBaseURL.localizedDescription
            return
        }

        do {
            let result = try await client.reassignUnknownEvents(device: reassignDevice)
            statusMessage = "Reassigned \(result.updated ?? 0) unknown events to \(result.device ?? reassignDevice)."
            await refreshDashboard()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func exportData() async {
        guard let client = apiClient else {
            errorMessage = MyriadAPIError.invalidBaseURL.localizedDescription
            return
        }

        do {
            let data = try await client.exportEvents()
            exportJSON = String(data: data, encoding: .utf8)
            statusMessage = "Export ready."
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func deleteAllData() async {
        guard let client = apiClient else {
            errorMessage = MyriadAPIError.invalidBaseURL.localizedDescription
            return
        }

        do {
            _ = try await client.deleteAllEvents()
            statusMessage = "Local data deleted."
            await refreshDashboard()
            await refreshGoals()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func login() async {
        guard let client = apiClient else {
            errorMessage = MyriadAPIError.invalidBaseURL.localizedDescription
            return
        }

        do {
            let response = try await client.login(username: authUsername, password: authPassword)
            token = response.token
            currentUser = response.user
            statusMessage = "Signed in as \(response.user?.username ?? authUsername)."
            authPassword = ""
            await refreshAll()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func register() async {
        guard let client = apiClient else {
            errorMessage = MyriadAPIError.invalidBaseURL.localizedDescription
            return
        }

        do {
            _ = try await client.register(username: authUsername, password: authPassword)
            let response = try await client.login(username: authUsername, password: authPassword)
            token = response.token
            currentUser = response.user
            statusMessage = "Registered and signed in as \(response.user?.username ?? authUsername)."
            authPassword = ""
            await refreshAll()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func signOut() async {
        token = nil
        currentUser = nil
        statusMessage = "Signed out. Local mode will resume on the next refresh."
        await refreshAll()
    }

    func requestNotificationPermission() async {
        do {
            let granted = try await notificationCenter.requestAuthorization(options: [.alert, .sound, .badge])
            statusMessage = granted ? "Notification nudges enabled." : "Notification permission denied."
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func buildStatusMessage() -> String {
        let totalEvents = summary?.totals?.totalEvents ?? 0
        let totalMinutes = summary?.totals?.totalMinutes ?? 0
        let riskLevel = plan?.interventions?.first(where: { ($0.riskLevel ?? "") == "critical" || ($0.riskLevel ?? "") == "high" })?.riskLevel ?? "steady"
        return "Tracking \(totalEvents) events, \(totalMinutes) minutes, risk: \(riskLevel)."
    }

    private func handleConnectivityFailure(_ error: Error) -> Bool {
        let nsError = error as NSError
        let offlineCodes: Set<Int> = [-1001, -1003, -1004, -1005, -1009]
        guard nsError.domain == NSURLErrorDomain || offlineCodes.contains(nsError.code) else {
            return false
        }

        statusMessage = "Offline until the backend at \(baseURLString) is available."
        return true
    }

    func scheduleNudgesIfNeeded() async {
        let interventions = plan?.interventions ?? []
        guard !interventions.isEmpty else {
            return
        }

        for intervention in interventions {
            let level = (intervention.riskLevel ?? "low").lowercased()
            guard level == "critical" || level == "high" else {
                continue
            }

            let key = "myriad.nudge.\(intervention.goalId)"
            let lastSent = UserDefaults.standard.double(forKey: key)
            let now = Date().timeIntervalSince1970
            guard lastSent == 0 || now - lastSent > 600 else {
                continue
            }

            let content = UNMutableNotificationContent()
            content.title = "Myriad: \(intervention.goalTitle ?? "Goal")"
            if level == "critical" {
                content.body = intervention.actions?.first ?? "Critical relapse risk detected. Pause and reset now."
            } else {
                content.body = intervention.actions?.first ?? "High risk detected. Take a short break and switch context."
            }
            content.sound = .default

            let request = UNNotificationRequest(identifier: key, content: content, trigger: nil)
            do {
                try await notificationCenter.add(request)
                UserDefaults.standard.set(now, forKey: key)
            } catch {
                continue
            }
        }
    }
}
