# System Diagrams

This document contains visually enhanced, professional-level Class and Use Case diagrams for the Cutline Business Manager project.

## Class Diagram

This diagram represents the core data entities and their cardinality. The classes are color-coded to visually separate functional domains, using dark, rich backgrounds with white text to ensure perfect visibility in both light and dark themes.

**Legend:**
🟦 **Core, Tenancy & Analytics** | 🟩 **Client & Feedback** | 🟪 **Project & Pre-Production** | 🟨 **Financials & Logs** | 🩵 **Messaging**

```mermaid
classDiagram
    direction TB
    
    %% Core & Multi-Tenancy
    class Business {
        +String id
        +String name
        +WorkspaceType workspaceType
        +String defaultCurrency
        +DateTime createdAt
    }
    class User {
        +String id
        +String email
        +String firstName
        +String lastName
    }
    class BusinessMembership {
        +String role
        +Int weeklyCapacityHours
    }
    class Notification {
        +String type
        +String title
        +Boolean isRead
    }
    class AnalyticsSnapshot {
        +DateTime date
        +Int revenueMTDCents
    }

    style Business fill:#1e3a8a,stroke:#3b82f6,stroke-width:2px,color:#ffffff
    style User fill:#1e3a8a,stroke:#3b82f6,stroke-width:2px,color:#ffffff
    style BusinessMembership fill:#1e3a8a,stroke:#3b82f6,stroke-width:2px,color:#ffffff
    style Notification fill:#1e3a8a,stroke:#3b82f6,stroke-width:2px,color:#ffffff
    style AnalyticsSnapshot fill:#1e3a8a,stroke:#3b82f6,stroke-width:2px,color:#ffffff

    %% CRM & Feedback
    class Client {
        +String id
        +String displayName
        +String email
        +Int internalRating
    }
    class FeedbackRequest {
        +String status
        +String token
    }
    class FeedbackResponse {
        +Int overallScore
        +Boolean consentToPublish
    }
    class Testimonial {
        +String displayText
        +Boolean isPublished
    }
    class ReviewRequest {
        +String status
        +String token
    }
    
    style Client fill:#064e3b,stroke:#10b981,stroke-width:2px,color:#ffffff
    style FeedbackRequest fill:#064e3b,stroke:#10b981,stroke-width:2px,color:#ffffff
    style FeedbackResponse fill:#064e3b,stroke:#10b981,stroke-width:2px,color:#ffffff
    style Testimonial fill:#064e3b,stroke:#10b981,stroke-width:2px,color:#ffffff
    style ReviewRequest fill:#064e3b,stroke:#10b981,stroke-width:2px,color:#ffffff

    %% Messaging
    class Conversation {
        +ConversationType type
        +String title
    }
    class ConversationParticipant {
        +Boolean isMuted
        +DateTime joinedAt
    }
    class Message {
        +String content
        +DateTime createdAt
    }

    style Conversation fill:#0f766e,stroke:#14b8a6,stroke-width:2px,color:#ffffff
    style ConversationParticipant fill:#0f766e,stroke:#14b8a6,stroke-width:2px,color:#ffffff
    style Message fill:#0f766e,stroke:#14b8a6,stroke-width:2px,color:#ffffff

    %% Project & Pre-Production
    class ProjectRequest {
        +String projectTitle
        +ProjectRequestStatus status
    }
    class Project {
        +String id
        +String title
        +String type
        +DateTime deadline
    }
    class WorkflowTemplate {
        +String name
        +String projectType
    }
    class WorkflowStage {
        +String name
        +Int orderIndex
    }
    class ProjectStageHistory {
        +DateTime enteredAt
        +DateTime exitedAt
    }
    class TimeEntry {
        +Int durationMinutes
        +Boolean isBillable
    }
    class Asset {
        +String type
        +String name
    }
    class ProjectAsset {
        +DateTime createdAt
    }
    class ProjectLink {
        +String url
        +String label
    }
    class Note {
        +String type
        +String content
    }

    style ProjectRequest fill:#4c1d95,stroke:#8b5cf6,stroke-width:2px,color:#ffffff
    style Project fill:#4c1d95,stroke:#8b5cf6,stroke-width:2px,color:#ffffff
    style WorkflowTemplate fill:#4c1d95,stroke:#8b5cf6,stroke-width:2px,color:#ffffff
    style WorkflowStage fill:#4c1d95,stroke:#8b5cf6,stroke-width:2px,color:#ffffff
    style ProjectStageHistory fill:#4c1d95,stroke:#8b5cf6,stroke-width:2px,color:#ffffff
    style TimeEntry fill:#4c1d95,stroke:#8b5cf6,stroke-width:2px,color:#ffffff
    style Asset fill:#4c1d95,stroke:#8b5cf6,stroke-width:2px,color:#ffffff
    style ProjectAsset fill:#4c1d95,stroke:#8b5cf6,stroke-width:2px,color:#ffffff
    style ProjectLink fill:#4c1d95,stroke:#8b5cf6,stroke-width:2px,color:#ffffff
    style Note fill:#4c1d95,stroke:#8b5cf6,stroke-width:2px,color:#ffffff

    %% Financials
    class Invoice {
        +String invoiceNumber
        +Int totalCents
        +InvoiceStatus status
    }
    class InvoiceLineItem {
        +String description
        +Int amountCents
    }
    class Payment {
        +Int amountCents
        +PaymentMethod method
    }
    class Expense {
        +Int amountCents
        +String category
    }
    class CreditNote {
        +Int amountCents
        +String reason
    }
    class InvoiceReminder {
        +String tone
        +String channel
    }
    class AuditLog {
        +String entityType
        +String action
    }

    style Invoice fill:#713f12,stroke:#eab308,stroke-width:2px,color:#ffffff
    style InvoiceLineItem fill:#713f12,stroke:#eab308,stroke-width:2px,color:#ffffff
    style Payment fill:#713f12,stroke:#eab308,stroke-width:2px,color:#ffffff
    style Expense fill:#713f12,stroke:#eab308,stroke-width:2px,color:#ffffff
    style CreditNote fill:#713f12,stroke:#eab308,stroke-width:2px,color:#ffffff
    style InvoiceReminder fill:#713f12,stroke:#eab308,stroke-width:2px,color:#ffffff
    style AuditLog fill:#713f12,stroke:#eab308,stroke-width:2px,color:#ffffff

    %% Relationships
    Business "1" *-- "*" BusinessMembership : contains
    User "1" *-- "*" BusinessMembership : has
    Business "1" *-- "*" Client : manages
    Business "1" *-- "*" Project : owns
    Business "1" *-- "*" Invoice : issues
    Business "1" *-- "*" Asset : owns
    Business "1" *-- "*" AnalyticsSnapshot : tracks
    Business "1" *-- "*" Notification : broadcasts
    Business "1" *-- "*" Conversation : hosts
    Business "1" *-- "*" AuditLog : logs

    User "1" *-- "*" Notification : receives
    
    Client "1" *-- "*" ProjectRequest : submits
    Client "1" *-- "*" Project : requests
    Client "1" *-- "*" Invoice : billed for
    Client "1" *-- "*" FeedbackRequest : receives
    Client "1" *-- "*" ReviewRequest : reviews

    Conversation "1" *-- "*" ConversationParticipant : has
    User "1" *-- "*" ConversationParticipant : joins
    Conversation "1" *-- "*" Message : contains
    User "1" *-- "*" Message : sends

    ProjectRequest "1" --> "0..1" Project : approved into
    
    FeedbackRequest "1" *-- "0..1" FeedbackResponse : yields
    FeedbackResponse "1" *-- "0..1" Testimonial : generates
    
    WorkflowTemplate "1" *-- "*" WorkflowStage : defines stages
    Project "*" --> "1" WorkflowStage : current stage
    Project "1" *-- "*" ProjectStageHistory : history
    WorkflowStage "1" *-- "*" ProjectStageHistory : logs
    Project "1" *-- "*" Note : has
    Project "1" *-- "*" ProjectLink : links
    Asset "1" *-- "*" ProjectAsset : usage
    Project "1" *-- "*" ProjectAsset : includes

    Invoice "1" *-- "*" InvoiceLineItem : contains
    Invoice "1" *-- "*" Payment : receives
    Invoice "1" *-- "*" CreditNote : adjusted by
    Invoice "1" *-- "*" InvoiceReminder : triggered
    Project "1" *-- "*" TimeEntry : logs
    Project "1" *-- "*" Expense : incurs
    User "1" --> "*" TimeEntry : logs
```

## Use Case Diagram

This diagram outlines specific, high-level business processes executed by our primary actors: Admin/Workspace Members, External Clients, and Automated System triggers. Subgraph backgrounds have been made transparent so they don't clash with your environment theme.

```mermaid
flowchart TB
    %% Themes and Styling
    classDef actor fill:#0f172a,stroke:#94a3b8,stroke-width:2px,color:#ffffff,font-weight:bold
    classDef system fill:#082f49,stroke:#38bdf8,stroke-width:2px,color:#ffffff,font-weight:bold
    
    classDef crmNode fill:#064e3b,stroke:#10b981,stroke-width:2px,color:#ffffff,rx:8,ry:8
    classDef pmNode fill:#4c1d95,stroke:#8b5cf6,stroke-width:2px,color:#ffffff,rx:8,ry:8
    classDef finNode fill:#713f12,stroke:#eab308,stroke-width:2px,color:#ffffff,rx:8,ry:8
    classDef msgNode fill:#0f766e,stroke:#14b8a6,stroke-width:2px,color:#ffffff,rx:8,ry:8

    %% Actors
    Admin(["🏢 Admin / Workspace Member"]):::actor
    Client(["👤 External Client"]):::actor
    System(["💻 System (Automated)"]):::system

    %% Use Case Boundaries
    subgraph CRM ["🤝 Client & Feedback Management"]
        direction TB
        OnboardClient([Onboard New Client]):::crmNode
        ViewClientPortal([Access Client Portal]):::crmNode
        RequestFeedback([Request Testimonials & Feedback]):::crmNode
        RequestReview([Post-Production Review Request]):::crmNode
    end
    style CRM fill:none,stroke:#10b981,stroke-width:2px,stroke-dasharray: 5 5,color:#10b981

    subgraph PM ["📋 Project & Workflow Management"]
        direction TB
        SubmitIntake([Submit Project Intake Form]):::pmNode
        ApproveIntake([Approve/Reject Intake]):::pmNode
        ConfigureWorkflow([Configure Project Workflows]):::pmNode
        UpdateStage([Update Project Stage]):::pmNode
        TrackTime([Track Billable Time & Notes]):::pmNode
        ManageAssets([Manage Licenses & Project Assets]):::pmNode
    end
    style PM fill:none,stroke:#8b5cf6,stroke-width:2px,stroke-dasharray: 5 5,color:#8b5cf6

    subgraph FIN ["💰 Financial Operations & Analytics"]
        direction TB
        GenerateInvoice([Generate & Issue Invoice]):::finNode
        SendReminder([Send Automated Payment Reminder]):::finNode
        ProcessPayment([Process Online Payment]):::finNode
        RecordExpense([Record Project Expenses]):::finNode
        GenerateReport([Generate Financial Analytics]):::finNode
        AuditLogs([Audit Financial & System Events]):::finNode
    end
    style FIN fill:none,stroke:#eab308,stroke-width:2px,stroke-dasharray: 5 5,color:#eab308

    subgraph MSG ["💬 Messaging & Notifications"]
        direction TB
        SendDirectMessage([Send Direct/Group Message]):::msgNode
        ReceiveNotification([Receive System Notification]):::msgNode
    end
    style MSG fill:none,stroke:#14b8a6,stroke-width:2px,stroke-dasharray: 5 5,color:#14b8a6

    %% Admin Interactions
    Admin -->|Manages| OnboardClient
    Admin -->|Triggers| RequestFeedback
    Admin -->|Triggers| RequestReview
    Admin -->|Approves| ApproveIntake
    Admin -->|Sets up| ConfigureWorkflow
    Admin -->|Updates| UpdateStage
    Admin -->|Logs| TrackTime
    Admin -->|Organizes| ManageAssets
    Admin -->|Creates| GenerateInvoice
    Admin -->|Logs| RecordExpense
    Admin -->|Views| GenerateReport
    Admin -->|Chats| SendDirectMessage

    %% Client Interactions
    Client -->|Fills out| SubmitIntake
    Client -->|Logs into| ViewClientPortal
    Client -.->|Provides| RequestFeedback
    Client -.->|Reviews Drafts| RequestReview
    Client -->|Pays| ProcessPayment
    Client -->|Chats| SendDirectMessage

    %% System Interactions
    System -->|Runs cron| SendReminder
    System -->|Logs events| AuditLogs
    System -->|Alerts| ReceiveNotification
    System -->|Snapshots| GenerateReport
    SendReminder -.->|Notifies| Client
    GenerateInvoice -.->|Includes data from| TrackTime
```
