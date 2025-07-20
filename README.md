[README.md](https://github.com/user-attachments/files/21336226/README.md)

# MMM - Mess Meal Manager

A comprehensive web application designed to help students track their daily nutritional intake from their college mess, while also providing a platform for mess operators to manage their services. MMM aims to promote healthier eating habits by providing detailed analytics, personalized goals, and gamified features like leaderboards and weekly challenges.

##  Features

- **User Roles:** Separate registration and dashboard experiences for **Students** and **Mess Operators**.
- **Mess Management:**
    - Students can enroll in a mess upon registration.
    - Flexibility to change the enrolled mess at any time.
- **Dynamic Meal Logging:**
    - Log meals (Breakfast, Lunch, Dinner) based on the specific menu of the enrolled mess.
    - Dynamically fetches and displays meal items for the selected day and meal type.
- **Comprehensive Nutritional Tracking:**
    - Tracks key macronutrients: Calories, Protein, Carbohydrates, and Fat.
    - Visual dashboard to see daily progress towards nutritional goals.
- **Analytics & Insights:**
    - **Weekly Analytics:** View detailed charts for daily intake of calories, protein, carbs, and fat over the last 7 days.
    - **Week-over-Week Comparison:** Compare your average intake this week versus the last week to track progress.
    - **30-Day Consistency Report:** Get a summary of your eating habits over the last 30 days, highlighting how consistently you've met your protein goals and avoided excessive fats and carbs.
- **Engagement & Motivation:**
    - **Leaderboard:** See your rank among other users based on a scoring system that promotes balanced nutrition.
    - **Water Intake Tracker:** Easily log your daily water consumption.
    - **Weekly Challenges:** Engaging challenges to keep users motivated.
- **Modern UI/UX:**
    - **Dark/Light Mode:** Seamlessly switch between dark and light themes.
    - **Responsive Design:** A clean, modern, and fully responsive interface that works on all devices.
    - **Toast Notifications:** Non-intrusive feedback for user actions.
- **User Profile:** A dedicated page to view personal details, enrolled mess, and recent meal history.
- **FAQ Page:** A helpful FAQ section with an accordion interface to answer common questions.

##  Tech Stack

- **Backend:** Node.js, Express.js
- **Frontend:** EJS (Embedded JavaScript templates), HTML5, CSS3, JavaScript
- **Database:** MySQL
- **Node.js Libraries:**
    - `express`: Web framework
    - `mysql2`: Database driver
    - `express-session`: Session management
    - `connect-session-knex`: MySQL session store
    - `bcrypt`: Password hashing
    - `body-parser`: Request body parsing
    - `dotenv`: Environment variable management
- **Frontend Libraries:**
    - `Chart.js`: For data visualization and analytics charts.
    - `Toastify.js`: For user-friendly notifications.

## ⚙️ Local Setup and Installation

Follow these steps to get the project running on your local machine.

### 1. Prerequisites
- [Node.js](https://nodejs.org/en/) (v14 or higher)
- [MySQL](https://www.mysql.com/downloads/)

### 2. Clone the Repository
```bash
git clone https://github.com/your_username/MMM.git
cd MMM
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Database Setup

1.  Connect to your MySQL server.
2.  Create a new database.
    ```sql
    CREATE DATABASE tau;
    USE tau;
    ```
3.  Execute the following SQL queries to create the necessary tables:

    ```sql
    CREATE TABLE users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        age INT,
        height DECIMAL(5,2),
        weight DECIMAL(5,2),
        goal VARCHAR(50),
        role VARCHAR(50) DEFAULT 'student',
        mess_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (mess_id) REFERENCES mess(id)
    );

    CREATE TABLE mess (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        address VARCHAR(255),
        contact_number VARCHAR(20),
        owner_id INT,
        FOREIGN KEY (owner_id) REFERENCES users(id)
    );

    CREATE TABLE mess_operator_details (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        mess_name VARCHAR(255) NOT NULL,
        mess_description TEXT,
        mess_address VARCHAR(255) NOT NULL,
        contact_number VARCHAR(20) NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE mess_menu_item (
        id INT AUTO_INCREMENT PRIMARY KEY,
        mess_id INT,
        day_of_week ENUM('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'),
        meal_type ENUM('Breakfast', 'Lunch', 'Dinner'),
        item_name VARCHAR(255),
        calories DECIMAL(10,2),
        protein DECIMAL(10,2),
        carbs DECIMAL(10,2),
        fat DECIMAL(10,2),
        FOREIGN KEY (mess_id) REFERENCES mess(id)
    );

    CREATE TABLE meal_intake (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        mess_id INT,
        meal_type VARCHAR(50),
        calories DECIMAL(10,2),
        protein DECIMAL(10,2),
        carbs DECIMAL(10,2),
        fat DECIMAL(10,2),
        intake_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (mess_id) REFERENCES mess(id)
    );
    ```

### 5. Environment Variables
Create a `.env` file in the root directory and add your database credentials.

```env
DB_HOST=localhost
DB_USER=your_mysql_user
DB_PASSWORD=your_mysql_password
DB_NAME=tau
SESSION_SECRET=your_strong_session_secret
```

### 6. Run the Application
```bash
npm start
```
The application should now be running at `http://localhost:3000`.


##  Contributing

Contributions are welcome! If you have ideas for improvements or find any bugs, feel free to open an issue or submit a pull request.

1.  **Fork** the repository.
2.  Create your feature branch (`git checkout -b feature/NewFeature`).
3.  **Commit** your changes (`git commit -m 'Add some NewFeature'`).
4.  **Push** to the branch (`git push origin feature/NewFeature`).
5.  Open a **Pull Request**.
