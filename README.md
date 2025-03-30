## App Overview

 The HeartLen App is a web-based tool designed to process photoplethysmography (PPG) signals captured via a webcam. It calculates heart rate, heart rate variability (HRV), and signal quality using machine learning models. The processed data can be saved to a MongoDB database for further analysis.

## Installation Instructions

### Prerequisites
- Node.js (v18 or higher)
- MongoDB Atlas account (or local MongoDB instance)

### Connecting to MongoDB
To link the app to your MongoDB database:
1. Create a MongoDB Atlas cluster or use a local MongoDB instance.
2. Copy the connection string from MongoDB Atlas and paste it into the `.env.local` file as shown below.
3. Ensure the database has a collection named `records` to store PPG data.

### Installation Steps
1. Clone the repository:
```bash
git clone https://github.com/Tptpvy/heartlens-app.git
cd heartlens-app
```    
2. Install depedencies:
```bash
npm install
```  
3. Set up environment variables
Create a `.env.local` file in the root directory and add your MongoDB connection string
```bash
MONGODB_URI=mongodb+srv://<your connection string>/<database name (optional)>?retryWrites=true&w=majority&appName=Cluster0
```
4. Start the development server
```bash
npm run dev
```
5. Open the app in your browser:
Navigate to [http://localhost:3000](http://localhost:3000)

## App Deployment

### Local Deployment
1. Build the production version:
```bash
npm run build
```
2. Start the build locally:
```bash
npm run start
```

### Vercel Deployment
1. Import your GitHub repository:
- Go to [Vercel](https://vercel.com) and sign up using your GitHub account.
- In the Vercel dashboard, click "Add New" and select "Project."
- Choose "Import Project from GitHub" and authorize Vercel to access your repositories.
- Select the repository you just pushed (e.g., heartlens-app).
2. Configure the deployment settings:
- Click "Environment Variables" and add the key-value pairs needed for your app to connect to MongoDB
- Key: `MONGODB_URI`
- Value: `mongodb+srv://<your connection string>/<database name (optional)>?retryWrites=true&w=majority&appName=Cluster0`
- Change the install command into ```npm install --legacy-peer-deps``` to bypass peer dependency conflicts
3. Deploy the app:
- Click "Deploy" to start the deployment process.
- Vercel will automatically build and deploy your app. Once complete, you'll receive a live URL (e.g., `https://heartlens-app.vercel.app`)