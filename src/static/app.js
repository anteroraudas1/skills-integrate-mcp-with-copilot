document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const userMenuButton = document.getElementById("user-menu-button");
  const userMenu = document.getElementById("user-menu");
  const authStatus = document.getElementById("auth-status");
  const loginMenuButton = document.getElementById("login-menu-button");
  const logoutMenuButton = document.getElementById("logout-menu-button");
  const loginModal = document.getElementById("login-modal");
  const loginForm = document.getElementById("login-form");
  const cancelLoginButton = document.getElementById("cancel-login-button");

  let authToken = localStorage.getItem("teacherToken") || "";
  let authUsername = localStorage.getItem("teacherUsername") || "";

  function authHeaders() {
    return authToken ? { Authorization: `Bearer ${authToken}` } : {};
  }

  function setAuthUi() {
    const isLoggedIn = Boolean(authToken);
    authStatus.textContent = isLoggedIn ? `Logged in: ${authUsername}` : "Not logged in";
    loginMenuButton.classList.toggle("hidden", isLoggedIn);
    logoutMenuButton.classList.toggle("hidden", !isLoggedIn);

    signupForm.querySelectorAll("input, select, button[type='submit']").forEach((el) => {
      el.disabled = !isLoggedIn;
    });
  }

  async function validateSession() {
    if (!authToken) {
      setAuthUi();
      return;
    }

    try {
      const response = await fetch("/auth/me", { headers: authHeaders() });
      if (!response.ok) {
        throw new Error("Session invalid");
      }
      const result = await response.json();
      authUsername = result.username;
      localStorage.setItem("teacherUsername", authUsername);
    } catch (error) {
      authToken = "";
      authUsername = "";
      localStorage.removeItem("teacherToken");
      localStorage.removeItem("teacherUsername");
    }

    setAuthUi();
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft =
          details.max_participants - details.participants.length;

        // Create participants HTML with delete icons instead of bullet points
        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span>${
                        authToken
                          ? `<button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button>`
                          : ""
                      }</li>`
                  )
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // Add event listeners to delete buttons
      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
          headers: authHeaders(),
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to unregister. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
          headers: authHeaders(),
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  userMenuButton.addEventListener("click", () => {
    userMenu.classList.toggle("hidden");
  });

  loginMenuButton.addEventListener("click", () => {
    loginModal.classList.remove("hidden");
    userMenu.classList.add("hidden");
  });

  cancelLoginButton.addEventListener("click", () => {
    loginModal.classList.add("hidden");
    loginForm.reset();
  });

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const username = document.getElementById("teacher-username").value;
    const password = document.getElementById("teacher-password").value;

    try {
      const response = await fetch("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.detail || "Login failed");
      }

      authToken = result.token;
      authUsername = result.username;
      localStorage.setItem("teacherToken", authToken);
      localStorage.setItem("teacherUsername", authUsername);
      setAuthUi();
      loginModal.classList.add("hidden");
      loginForm.reset();

      messageDiv.textContent = `Welcome, ${authUsername}`;
      messageDiv.className = "success";
      messageDiv.classList.remove("hidden");
      fetchActivities();
    } catch (error) {
      messageDiv.textContent = error.message || "Login failed";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
    }
  });

  logoutMenuButton.addEventListener("click", async () => {
    try {
      await fetch("/auth/logout", { method: "POST", headers: authHeaders() });
    } catch (error) {
      console.error("Logout request failed:", error);
    }

    authToken = "";
    authUsername = "";
    localStorage.removeItem("teacherToken");
    localStorage.removeItem("teacherUsername");
    setAuthUi();
    userMenu.classList.add("hidden");
    fetchActivities();
  });

  document.addEventListener("click", (event) => {
    if (!userMenu.contains(event.target) && !userMenuButton.contains(event.target)) {
      userMenu.classList.add("hidden");
    }
  });

  // Initialize app
  validateSession().then(fetchActivities);
});
