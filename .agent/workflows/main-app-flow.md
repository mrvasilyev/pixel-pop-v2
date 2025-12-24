---
description: Main App Development Workflow (Telegram Mini App)
---

# Telegram Mini App Development Workflow

Based on `frontend/docs/how-to.png`.

1. **Idea Conceptualisation**
   - Define the project's core concept and requirements.

2. **Establish Development Environment**
   - Setup necessary tools and local environment.
   - **Frontend**:
     ```bash
     cd frontend
     npm install
     ```
   - **Backend**:
     Check requirements and install dependencies.

3. **Designing User Interface**
   - Create visual design and user experience.
   - Use `frontend/src/content/styles` for style definitions if applicable.

4. **Implementation**
   - Core development and coding phase.
   - **Run Frontend**:
     ```bash
     cd frontend
     npm run dev
     ```
   - **Run Backend**:
     ```bash
     cd backend
     .venv/bin/python main.py
     ```
   - **Railway Link**:
     ```bash
     railway link
     ```

5. **Quality Assurance**
   - Test application for bugs.
   - **Frontend Tests**:
     ```bash
     cd frontend
     npm run test
     ```

6. **Deployment**
   - Launch app to live environment.
   - **Railway**:
     ```bash
     railway up
     ```
   - **Frontend Build**:
     ```bash
     cd frontend
     npm run build
     ```

7. **Maintenance and Support**
   - Ongoing post-launch support and updates.
