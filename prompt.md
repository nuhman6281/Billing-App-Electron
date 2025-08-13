# Complete Billing & Accounting Application Development Prompt

Generate a comprehensive, production-ready billing and accounting application with the following specifications:

## **Technology Stack**

- **Frontend**: Electron + React 18 + TypeScript + Tailwind CSS + Shadcn/UI
- **Backend**: Node.js + Express + TypeScript + Prisma ORM
- **Databases**: SQLite (offline/local) + PostgreSQL (online/server)
- **DevOps**: Docker + Docker Compose + GitHub Actions CI/CD
- **Authentication**: JWT + Refresh Tokens + Role-Based Access Control
- **Real-time**: Socket.io for live updates
- **Testing**: Jest + React Testing Library + Supertest
- **Documentation**: Swagger/OpenAPI + JSDoc

## **Architecture Requirements**

### **Project Structure**

```
accounting-app/
├── packages/
│   ├── desktop/           # Electron app
│   ├── shared/            # Shared types/utilities
│   └── server/            # Node.js backend
├── docker/
├── docs/
└── scripts/
```

### **Offline-First Architecture**

- Implement robust offline synchronization with conflict resolution
- Local-first data storage with automatic background sync
- Queue-based operations for offline scenarios
- Progressive sync with delta updates
- Optimistic UI updates with rollback capabilities
- Network status detection and handling

## **Core Accounting Features**

### **Chart of Accounts**

- Hierarchical account structure (Assets, Liabilities, Equity, Revenue, Expenses)
- Account types: Current Assets, Fixed Assets, Current/Long-term Liabilities, etc.
- Account codes with customizable numbering system
- Account groups and sub-groups
- Opening balances and account history
- Bulk account creation/import

### **Journal & Ledger Management**

- Double-entry bookkeeping system
- General journal with automatic posting
- General ledger with drill-down capabilities
- Subsidiary ledgers (AP, AR, Fixed Assets)
- Journal entry templates and recurring entries
- Batch journal processing
- Journal approval workflow

### **Financial Statements**

- Trial Balance (Adjusted/Unadjusted)
- Balance Sheet (Comparative/Consolidated)
- Profit & Loss Statement (Monthly/Quarterly/Annual)
- Cash Flow Statement (Direct/Indirect method)
- Statement of Owner's Equity
- Notes to Financial Statements
- Multi-period comparative reports
- Customizable report layouts and formatting

### **Accounts Receivable**

- Customer master data management
- Credit limit and terms management
- Aging reports (30, 60, 90, 120+ days)
- Collection management and follow-up
- Bad debt provisions and write-offs
- Customer statements and dunning letters
- Payment allocation and matching

### **Accounts Payable**

- Vendor master data management
- Purchase order integration
- 3-way matching (PO, Receipt, Invoice)
- Payment scheduling and batch payments
- Vendor aging reports
- Hold/Release functionality
- Vendor statements reconciliation

## **Advanced Billing Features**

### **Invoice Management**

- Professional invoice templates with customization
- Recurring invoicing with flexible schedules
- Partial invoicing and progress billing
- Multi-currency invoicing with exchange rates
- Tax calculation (VAT, Sales Tax, GST) with multiple rates
- Discount management (line-item, invoice-level)
- Invoice approval workflow
- PDF generation and email delivery

### **Quote & Estimate System**

- Professional quote templates
- Quote versioning and revision tracking
- Quote approval process
- Convert quotes to invoices/sales orders
- Quote expiration management
- Quote comparison and analysis
- Client portal for quote viewing/approval

### **Payment Processing**

- Multiple payment methods (Cash, Check, Card, Bank Transfer)
- Payment matching and allocation
- Partial payments and payment plans
- Overpayment and credit management
- Payment reconciliation
- Integration with payment gateways (Stripe, PayPal)
- Automatic payment reminders

### **Purchase Management**

- Purchase requisition workflow
- Purchase order creation and management
- Vendor comparison and selection
- Receipt management and matching
- Purchase returns and allowances
- Blanket orders and release schedules

## **Premium Features**

### **Advanced Reporting & Analytics**

- Interactive dashboards with KPI widgets
- Financial ratio analysis
- Trend analysis and forecasting
- Budget vs Actual reporting
- Variance analysis
- Executive summary reports
- Drill-down capabilities
- Custom report builder
- Scheduled report generation and delivery

### **Budget Management**

- Annual budget preparation
- Department/Project-wise budgeting
- Budget versions and scenarios
- Budget approval workflow
- Budget monitoring and alerts
- Variance analysis and reporting
- Rolling forecasts

### **Project & Job Costing**

- Project setup and management
- Time and expense tracking
- Resource allocation and utilization
- Project profitability analysis
- Work-in-progress reporting
- Project billing and invoicing
- Change order management

### **Inventory Management**

- Item master data with categories
- Multiple warehouses/locations
- Inventory valuation methods (FIFO, LIFO, Weighted Average)
- Stock movement tracking
- Reorder point and safety stock
- Inventory adjustments and cycle counting
- Inventory reports and analysis

### **Fixed Assets Management**

- Asset registration and tracking
- Depreciation calculation (Straight-line, Declining Balance, Units of Production)
- Asset transfers and disposals
- Maintenance scheduling and tracking
- Asset reports and registers
- Barcode/RFID integration

### **Multi-Company Support**

- Company hierarchy management
- Consolidated reporting
- Inter-company transactions
- Company-specific configurations
- Centralized user management
- Cross-company reporting

### **Tax Management**

- Multiple tax jurisdictions
- Tax code configuration
- Automated tax calculations
- Tax reporting and filing
- Sales tax returns
- 1099 processing
- Tax audit trail

## **Technical Implementation Requirements**

### **Database Design**

- Comprehensive normalized schema
- Database migrations and versioning
- Data archiving and purging
- Performance optimization with indexing
- Database backup and recovery procedures
- Connection pooling and management

### **API Design**

- RESTful API with OpenAPI documentation
- GraphQL endpoints for complex queries
- API versioning and backward compatibility
- Rate limiting and throttling
- Request/Response logging
- Error handling and standardized responses
- Bulk operations support

### **Security Features**

- Multi-factor authentication (MFA)
- Role-based access control (RBAC)
- Field-level security
- Audit trail and activity logging
- Data encryption at rest and in transit
- Session management and timeout
- IP whitelisting and blacklisting
- Regular security scanning

### **Performance Optimization**

- Database query optimization
- Caching strategies (Redis integration)
- Lazy loading and pagination
- Background job processing
- Memory management
- Bundle optimization for Electron

### **Offline Synchronization**

- Conflict resolution algorithms
- Last-writer-wins with timestamp comparison
- Operational transformation for concurrent edits
- Sync queue management
- Incremental sync with checksums
- Bandwidth-efficient synchronization
- Automatic retry mechanisms

### **Error Handling & Logging**

- Comprehensive error handling middleware
- Structured logging with Winston
- Error tracking and monitoring
- User-friendly error messages
- Retry mechanisms for failed operations
- Performance monitoring and alerting

## **User Interface Requirements**

### **Desktop Application (Electron)**

- Modern, responsive design with dark/light themes
- Keyboard shortcuts and accessibility features
- Multi-tab interface with workspace management
- Customizable dashboards and widgets
- Advanced search and filtering
- Bulk operations interface
- Print preview and formatting
- Export functionality (PDF, Excel, CSV)

### **User Experience Features**

- Intuitive navigation and breadcrumbs
- Context-sensitive help and tooltips
- Quick actions and shortcuts
- Advanced search with filters
- Customizable views and layouts
- Drag-and-drop functionality
- Real-time notifications
- Progressive disclosure of advanced features

## **Integration Capabilities**

- Banking integration for transaction import
- Payment gateway integrations
- Email service integration (SendGrid, Mailgun)
- Document storage integration (AWS S3, Google Drive)
- CRM system integrations
- E-commerce platform connectors
- Payroll system integration
- Government filing system integration

## **Deployment & DevOps**

- Docker containerization with multi-stage builds
- Environment-specific configurations
- Automated testing and deployment pipelines
- Database migration scripts
- Health checks and monitoring
- Log aggregation and analysis
- Backup and disaster recovery procedures
- Scalability planning and load balancing

## **Code Quality Requirements**

- TypeScript strict mode
- ESLint and Prettier configuration
- Husky pre-commit hooks
- 90%+ test coverage
- Code documentation and comments
- Design patterns implementation
- SOLID principles adherence
- Clean architecture implementation

## **Additional Requirements**

- Multi-language support (i18n)
- Multi-currency with real-time exchange rates
- Print management with custom templates
- Email templates and automation
- Document attachments and management
- Advanced search with Elasticsearch integration
- Real-time collaboration features
- Mobile-responsive web interface
- Plugin architecture for extensibility

## **Expected Deliverables**

1. Complete source code with proper folder structure
2. Database schema and migration scripts
3. API documentation with Swagger
4. User manual and technical documentation
5. Docker configuration files
6. Test suites with high coverage
7. Deployment scripts and CI/CD configuration
8. Sample data and demo setup
9. Configuration management system
10. Performance benchmarking results

Generate a production-ready, scalable, and maintainable codebase that follows industry best practices and includes comprehensive error handling, logging, testing, and documentation. Ensure all features are fully functional with no breaking issues and provide clear setup instructions.
