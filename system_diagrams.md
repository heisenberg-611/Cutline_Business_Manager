# System Diagrams

This document contains visually enhanced, professional-level Class and Use Case diagrams for the Cutline Business Manager project.

## Class Diagram

This diagram represents the core data entities and their cardinality. The classes are color-coded to visually separate functional domains, using dark, rich backgrounds with white text to ensure perfect visibility in both light and dark themes.

**Legend:**
🟦 **Core & Multi-Tenancy** | 🟩 **Client Management** | 🟪 **Project Management** | 🟨 **Financials**

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
        +Json preferences
    }
    class BusinessMembership {
        +String role
        +Int weeklyCapacityHours
    }

    style Business fill:#1e3a8a,stroke:#3b82f6,stroke-width:2px,color:#ffffff
    style User fill:#1e3a8a,stroke:#3b82f6,stroke-width:2px,color:#ffffff
    style BusinessMembership fill:#1e3a8a,stroke:#3b82f6,stroke-width:2px,color:#ffffff

    %% CRM / Client Management
    class Client {
        +String id
        +String displayName
        +String companyName
        +String email
        +String phone
        +Int internalRating
    }
    
    style Client fill:#064e3b,stroke:#10b981,stroke-width:2px,color:#ffffff

    %% Project & Pre-Production
    class ProjectRequest {
        +String projectTitle
        +ProjectRequestStatus status
        +String clientName
    }
    class Project {
        +String id
        +String title
        +String type
        +DateTime deadline
        +Boolean isArchived
    }
    class WorkflowTemplate {
        +String name
        +String projectType
    }
    class WorkflowStage {
        +String name
        +Int orderIndex
        +Int estimatedHours
        +Boolean billingTrigger
    }
    class TimeEntry {
        +Int durationMinutes
        +Boolean isBillable
        +DateTime startedAt
    }
    class Asset {
        +String type
        +String name
        +String licenseType
    }
    class Note {
        +String type
        +String content
    }

    style ProjectRequest fill:#4c1d95,stroke:#8b5cf6,stroke-width:2px,color:#ffffff
    style Project fill:#4c1d95,stroke:#8b5cf6,stroke-width:2px,color:#ffffff
    style WorkflowTemplate fill:#4c1d95,stroke:#8b5cf6,stroke-width:2px,color:#ffffff
    style WorkflowStage fill:#4c1d95,stroke:#8b5cf6,stroke-width:2px,color:#ffffff
    style TimeEntry fill:#4c1d95,stroke:#8b5cf6,stroke-width:2px,color:#ffffff
    style Asset fill:#4c1d95,stroke:#8b5cf6,stroke-width:2px,color:#ffffff
    style Note fill:#4c1d95,stroke:#8b5cf6,stroke-width:2px,color:#ffffff

    %% Financials
    class Invoice {
        +String invoiceNumber
        +Int totalCents
        +Int amountDueCents
        +InvoiceStatus status
        +DateTime dueDate
    }
    class InvoiceLineItem {
        +String description
        +Int quantity
        +Int amountCents
    }
    class Payment {
        +Int amountCents
        +PaymentMethod method
        +DateTime reconciledAt
    }
    class Expense {
        +Int amountCents
        +String category
        +String description
    }

    style Invoice fill:#713f12,stroke:#eab308,stroke-width:2px,color:#ffffff
    style InvoiceLineItem fill:#713f12,stroke:#eab308,stroke-width:2px,color:#ffffff
    style Payment fill:#713f12,stroke:#eab308,stroke-width:2px,color:#ffffff
    style Expense fill:#713f12,stroke:#eab308,stroke-width:2px,color:#ffffff

    %% Relationships
    Business "1" *-- "*" BusinessMembership : contains
    User "1" *-- "*" BusinessMembership : has
    Business "1" *-- "*" Client : manages
    Business "1" *-- "*" Project : owns
    Business "1" *-- "*" Invoice : issues
    Business "1" *-- "*" Asset : owns

    Client "1" *-- "*" ProjectRequest : submits
    Client "1" *-- "*" Project : requests
    Client "1" *-- "*" Invoice : billed for

    ProjectRequest "1" --> "0..1" Project : approved into

    WorkflowTemplate "1" *-- "*" WorkflowStage : defines stages
    Project "*" --> "1" WorkflowStage : current stage
    Project "1" *-- "*" Note : has
    Project "1" *-- "*" Asset : utilizes

    Invoice "1" *-- "*" InvoiceLineItem : contains
    Invoice "1" *-- "*" Payment : receives
    Project "1" *-- "*" TimeEntry : logs
    Project "1" *-- "*" Expense : incurs
    User "1" --> "*" TimeEntry : logs
```

## Use Case Diagram

This diagram outlines specific, high-level business processes executed by our primary actors: Admin/Workspace Members, External Clients, and Automated System triggers. Subgraph backgrounds have been made transparent so they don't clash with your environment theme.

```mermaid
flowchart LR
    %% Themes and Styling
    classDef actor fill:#0f172a,stroke:#94a3b8,stroke-width:2px,color:#ffffff,font-weight:bold
    classDef system fill:#082f49,stroke:#38bdf8,stroke-width:2px,color:#ffffff,font-weight:bold
    
    classDef crmNode fill:#064e3b,stroke:#10b981,stroke-width:2px,color:#ffffff,rx:8,ry:8
    classDef pmNode fill:#4c1d95,stroke:#8b5cf6,stroke-width:2px,color:#ffffff,rx:8,ry:8
    classDef finNode fill:#713f12,stroke:#eab308,stroke-width:2px,color:#ffffff,rx:8,ry:8

    %% Actors
    Admin(["🏢 Admin / Workspace Member"]):::actor
    Client(["👤 External Client"]):::actor
    System(["💻 System (Automated)"]):::system

    %% Use Case Boundaries
    subgraph CRM ["🤝 Client Relationship Management"]
        direction TB
        OnboardClient([Onboard New Client]):::crmNode
        ViewClientPortal([Access Client Portal]):::crmNode
        RequestFeedback([Request Testimonials & Feedback]):::crmNode
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

    subgraph FIN ["💰 Financial Operations"]
        direction TB
        GenerateInvoice([Generate & Issue Invoice]):::finNode
        SendReminder([Send Automated Payment Reminder]):::finNode
        ProcessPayment([Process Online Payment]):::finNode
        RecordExpense([Record Project Expenses]):::finNode
        GenerateReport([Generate Financial Analytics]):::finNode
    end
    style FIN fill:none,stroke:#eab308,stroke-width:2px,stroke-dasharray: 5 5,color:#eab308

    %% Admin Interactions
    Admin -->|Manages| OnboardClient
    Admin -->|Triggers| RequestFeedback
    Admin -->|Approves| ApproveIntake
    Admin -->|Sets up| ConfigureWorkflow
    Admin -->|Updates| UpdateStage
    Admin -->|Logs| TrackTime
    Admin -->|Organizes| ManageAssets
    Admin -->|Creates| GenerateInvoice
    Admin -->|Logs| RecordExpense
    Admin -->|Views| GenerateReport

    %% Client Interactions
    Client -->|Fills out| SubmitIntake
    Client -->|Logs into| ViewClientPortal
    Client -.->|Provides| RequestFeedback
    Client -->|Pays| ProcessPayment

    %% System Interactions
    System -->|Runs cron| SendReminder
    SendReminder -.->|Notifies| Client
    GenerateInvoice -.->|Includes data from| TrackTime
```
