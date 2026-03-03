# Running IRDB Locally

Since your database is on a private network (`10.118.249.195`), the cloud version of this app cannot reach it. To connect to your real database, you need to run this application on your own computer or a server inside your network.

## Option 1: Using Docker (Recommended)

1.  **Download the code**: Export this project to your computer.
2.  **Install Docker**: Ensure Docker Desktop is installed.
3.  **Run the app**:
    ```bash
    # Build and start the container
    docker-compose up --build
    ```
4.  **Access**: Open `http://localhost:3000` in your browser.
5.  **Connect**: Enter your database credentials. Since the app is now running on your network, it will be able to reach `10.118.249.195`.

## Option 2: Using Node.js directly

1.  **Install Node.js**: Ensure Node.js (v18 or v20) is installed.
2.  **Install dependencies**:
    ```bash
    npm install
    ```
3.  **Start the app**:
    ```bash
    npm run start
    ```
4.  **Access**: Open `http://localhost:3000`.

## Gemini API Key
Remember to set your `GEMINI_API_KEY` in the `.env` file or environment variables for the AI features to work locally.
