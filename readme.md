# Retail App 🛍️

A university marketplace app where students can upload, buy, sell, or donate items such as books, clothes, and electronics.  
Built with **React (frontend)**, **Node.js + Express (backend)**, **PostgreSQL (database)**, and **Prisma (ORM)**.  
Authentication is handled via **Auth0**, and product images are stored in **Supabase**.

---

## 🚀 Features
- User authentication with **Auth0**
- Upload and manage product listings
- Categorized browsing of items
- Cart and checkout flow with mock payment processing
- PostgreSQL + Prisma backend
- Supabase storage for product images

---

## 🛠️ Tech Stack
- **Frontend:** React 18, Tailwind CSS, Axios  
- **Backend:** Node.js, Express, Prisma ORM  
- **Database:** PostgreSQL  
- **Auth:** Auth0 (OIDC)  
- **Storage:** Supabase (product images)

---

##  Setup Instructions

### 1. Clone the Repository
```bash
git clone https://github.com/IzahSohail/Retail_App.git
cd Retail_App
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Setup
Create a `.env` file in the root directory with:
```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/retail_app"

# Auth0
AUTH0_SECRET="your-auth0-secret"
AUTH0_BASE_URL="http://localhost:3000"
AUTH0_ISSUER_BASE_URL="https://your-domain.auth0.com"
AUTH0_CLIENT_ID="your-client-id"
AUTH0_CLIENT_SECRET="your-client-secret"

# Supabase (for images)
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
SUPABASE_BUCKET="products"
```

### 4. Database Setup
```bash
# Run Prisma migrations
npx prisma migrate dev

# Seed the database with sample data
npm run seed
```

### 5. Run the Application
```bash
# Start both frontend and backend
npm run dev

# Or start individually:
npm run dev:backend  # Backend on http://localhost:3001
npm run dev:frontend # Frontend on http://localhost:3000
```

---

## 🧪 Testing

Run the test suite:
```bash
# Run all tests from root directory
npx jest tests/unit/payment.test.js tests/unit/priceCalculation.test.js tests/integration/cart.test.js
```

**Test Coverage:**
-  2 Unit Tests (payment processing, price calculations)
-  1 Integration Test (cart operations with database)

---

## 📁 Project Structure

```
Retail_App/
├── backend/           # Node.js + Express API
│   ├── src/
│   │   ├── server.js  # Main server file
│   │   ├── db.js      # Prisma client
│   │   └── seed.js    # Database seeder
│   └── package.json
├── frontend/          # React application
│   ├── src/
│   │   ├── App.js     # Main React component
│   │   └── components/
│   └── package.json
├── prisma/
│   ├── schema.prisma  # Database schema
│   └── migrations/    # Database migrations
├── tests/             # Test files
│   ├── unit/          # Unit tests
│   └── integration/   # Integration tests
└── package.json       # Root package.json
```

---

## 🔧 Key Features Explained

- **Authentication:** Secure login with Auth0
- **Product Management:** Upload, edit, delete listings
- **Shopping Cart:** Add items, manage quantities, checkout
- **Payment Processing:** Mock payment system (always approves)
- **Image Storage:** Product photos stored in Supabase
- **Database:** PostgreSQL with Prisma ORM for type safety

---

## 🚀 Usage

1. **Login** with Auth0
2. **Browse Products** on the home page
3. **Add to Cart** or buy items from other students
4. **Upload Your Items** using the "List Item" button
5. **Manage Your Listings** in "My Listings"
6. **Complete Purchase** through the cart checkout flow

---