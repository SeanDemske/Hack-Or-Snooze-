$(async function() {
  // cache some selectors we'll be using quite a bit
  const $allStoriesList = $("#all-articles-list");
  const $favoritedArticlesList = $("#favorited-articles");
  const $myArticlesList = $("#my-articles");
  const $submitForm = $("#submit-form");
  const $filteredArticles = $("#filtered-articles");
  const $loginForm = $("#login-form");
  const $createAccountForm = $("#create-account-form");
  const $ownStories = $("#my-articles");
  const $navLogin = $("#nav-login");
  const $navLogOut = $("#nav-logout");
  const $navSubmitBtn = $("#nav-submit");
  const $navFavoritesBtn = $("#nav-favorites");
  const $navMyStoriesBtn = $("#nav-my-stories");
  const $navLinksContainer = $("#nav-link-container");
  const $storySubmitBtn = $("#story-submit-btn")

  // Keeps track of what view tab is being displayed
  let globalViewState = "all";

  // global storyList variable
  let storyList = null;

  // global currentUser variable
  let currentUser = null;

  await checkIfLoggedIn();

  /**
   * Event listener for logging in.
   *  If successfully we will setup the user instance
   */

  $loginForm.on("submit", async function(evt) {
    evt.preventDefault(); // no page-refresh on submit

    // grab the username and password
    const username = $("#login-username").val();
    const password = $("#login-password").val();

    // call the login static method to build a user instance
    const userInstance = await User.login(username, password);
    // set the global user to the user instance
    currentUser = userInstance;
    syncCurrentUserToLocalStorage();
    loginAndSubmitForm();
  });

  /**
   * Event listener for signing up.
   *  If successfully we will setup a new user instance
   */

  $createAccountForm.on("submit", async function(evt) {
    evt.preventDefault(); // no page refresh

    // grab the required fields
    let name = $("#create-account-name").val();
    let username = $("#create-account-username").val();
    let password = $("#create-account-password").val();

    // call the create method, which calls the API and then builds a new user instance
    const newUser = await User.create(username, password, name);
    currentUser = newUser;
    syncCurrentUserToLocalStorage();
    loginAndSubmitForm();
  });

  /**
   * Log Out Functionality
   */

  $navLogOut.on("click", function() {
    // empty out local storage
    localStorage.clear();
    // refresh the page, clearing memory
    location.reload();
  });

  /**
   * Event Handler for Clicking Login
   */

  $navLogin.on("click", function() {
    // Show the Login and Create Account Forms
    $loginForm.slideToggle();
    $createAccountForm.slideToggle();
    $allStoriesList.toggle();
  });

  /**
   * Event handler for Navigation to Homepage
   */

  // $("body").on("click", "#nav-all", async function() {
  //   hideElements();
  //   await generateStories();
  //   $allStoriesList.show();
  // });

  /**
   * Event handler for Navigation submit a tag
   */

  $navSubmitBtn.on("click", function() {
    $submitForm.toggle();
  })

  /**
   * Event handler for favorites a tag
   */

  $navFavoritesBtn.on("click", function() {
    generateFavoritesView();
  })

  /**
   * Event handler for my stories a tag
   */

  $navMyStoriesBtn.on("click", function() {
    generateMyStoriesView();
  })

  /**
   * Event handler for hitting the favorite button
   */

  async function handleFavoriteClick(evt) {
    await storyList.toggleStoryToFavorites(currentUser, $(evt.target).closest("li").attr("id"));
    updateFavoritesDisplay($(evt.target));
    if (globalViewState === "favorites") {
      generateFavoritesView();
    }
  }

  // $(".heart").on("click", async function(evt) {

  // });

  /**
   * Event handler for hitting the favorite button
   */

  async function handleTrashClick(evt) {
    const storyId = $(evt.target).closest("li").attr("id");
    console.log(storyId);
    await storyList.deleteStory(currentUser, storyId);
    $(evt.target).closest("li").remove();
  }

  /**
   * Event handler for submitting a story
   */

  $storySubmitBtn.on("click", async function() {
    const userStory = {
      author: $("#author").val(),
      title: $("#title").val(),
      url: $("#url").val()
    }
    await storyList.addStory(currentUser, userStory);
    location.reload();
  });

  /**
   * On page load, checks local storage to see if the user is already logged in.
   * Renders page information accordingly.
   */

  async function checkIfLoggedIn() {
    // let's see if we're logged in
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");

    // if there is a token in localStorage, call User.getLoggedInUser
    //  to get an instance of User with the right details
    //  this is designed to run once, on page load
    currentUser = await User.getLoggedInUser(token, username);
    await generateStories();

    if (currentUser) {
      showNavForLoggedInUser();
      updateAccountDisplay();
      addFavoriteButtonsToMyStories();
      updateFavoritesDisplay();
      addTrashButtonsToMyStories();
    }
  }

  /**
   * A rendering function to run to reset the forms and hide the login info
   */

  function loginAndSubmitForm() {
    // hide the forms for logging in and signing up
    $loginForm.hide();
    $createAccountForm.hide();

    // reset those forms
    $loginForm.trigger("reset");
    $createAccountForm.trigger("reset");

    // show the stories
    $allStoriesList.show();

    // update the navigation bar
    showNavForLoggedInUser();

    // Update account details
    updateAccountDisplay(); 

    // UI for favorited stories
    addFavoriteButtonsToMyStories();
    updateFavoritesDisplay();

    addTrashButtonsToMyStories();
  }

  /**
   * A function to clear articles
   *  
   */
  function emptyArticles() {
    $allStoriesList.empty();
    $favoritedArticlesList.empty();
    $myArticlesList.empty();
  }
  /**
   * A rendering function to call the StoryList.getStories static method,
   *  which will generate a storyListInstance. Then render it.
   */

  async function generateStories() {
    // get an instance of StoryList
    const storyListInstance = await StoryList.getStories();
    // update our global variable
    storyList = storyListInstance;
    // empty out that part of the page
    emptyArticles();

    // loop through all of our stories and generate HTML for them
    for (let story of storyList.stories) {
      const result = generateStoryHTML(story);
      $allStoriesList.append(result);
    }

    displayCorrectArticleElement("all");
  }

  async function generateFavoritesView() {
    emptyArticles();
    for (let favorite of currentUser.favorites) {
      const result = generateStoryHTML(favorite);
      $favoritedArticlesList.append(result);
    }
    $(".heart").removeClass("hidden");
    addFavoriteButtonsToMyStories();
    updateFavoritesDisplay();
    addTrashButtonsToMyStories();
    displayCorrectArticleElement("favorites");
  }

  async function generateMyStoriesView() {
    emptyArticles();
    for (let myStory of currentUser.ownStories) {
      const result = generateStoryHTML(myStory);
      $myArticlesList.append(result);
    }
    $(".heart").removeClass("hidden");
    addFavoriteButtonsToMyStories();
    updateFavoritesDisplay();
    addTrashButtonsToMyStories();
    displayCorrectArticleElement("my_stories");
  }

  function displayCorrectArticleElement(state) {
    let header;
    switch(state) {
      case "all":
        $allStoriesList.show();
        $favoritedArticlesList.hide();
        $myArticlesList.hide();
        globalViewState = "all";
        break;
      case "favorites":
        $allStoriesList.hide();
        $myArticlesList.hide();
        header = $(`<h3>Favorites</h3>`);
        $favoritedArticlesList.prepend(header);
        $favoritedArticlesList.show();
        globalViewState = "favorites";
        break;
      case "my_stories":
        $allStoriesList.hide();
        $favoritedArticlesList.hide();
        header = $(`<h3>My Articles</h3>`);
        $myArticlesList.prepend(header);
        $myArticlesList.show();
        globalViewState = "my_stories";
        break;
      default:
        console.log("error in displayCorrectArticleElement switch statement");
    } 
  }

  /**
   * A function to render HTML for an individual Story instance
   */


  //  <i class="fas fa-heart hidden heart"></i>
  function generateStoryHTML(story) {
    let hostName = getHostName(story.url);

    // render story markup
    const storyMarkup = $(`
      <li id="${story.storyId}" class="story-li">
        <a class="article-link" href="${story.url}" target="a_blank">
          <strong>${story.title}</strong>
        </a>
        <small class="article-author">by ${story.author}</small>
        <small class="article-hostname ${hostName}">(${hostName})</small>
        <small class="article-username">posted by ${story.username}</small>
      </li>
    `);

    return storyMarkup;
  }

  /* hide all elements in elementsArr */

  function hideElements() {
    const elementsArr = [
      $submitForm,
      $allStoriesList,
      $filteredArticles,
      $ownStories,
      $loginForm,
      $createAccountForm
    ];
    elementsArr.forEach($elem => $elem.hide());
  }

  function showNavForLoggedInUser() {
    $navLogin.hide();
    $navLogOut.show();
    $navLinksContainer.show();
  }

  /* simple function to pull the hostname from a URL */

  function getHostName(url) {
    let hostName;
    if (url.indexOf("://") > -1) {
      hostName = url.split("/")[2];
    } else {
      hostName = url.split("/")[0];
    }
    if (hostName.slice(0, 4) === "www.") {
      hostName = hostName.slice(4);
    }
    return hostName;
  }


  function updateAccountDisplay() {
    if (currentUser) {
      $("#account-display-name").text(currentUser.name);
      $("#account-display-username").text(currentUser.username);
      $("#account-display-date").text(currentUser.createdAt);
      $(".heart").removeClass("hidden");
    } else {
      $(".account-details").text("N/A");
      alert("Shouldnt be seeing this");
    }
  }

  // Apply correct styling to heart icons
  function updateFavoritesDisplay(selectedHeart) {

    // if an argument was passed, just handle individual heart
    if (selectedHeart) {
      if (currentUser.favorites.some(function(story) {
        return story.storyId === selectedHeart.closest("li").attr("id");
      })) {
        selectedHeart.addClass("favorited");
      } else {
        selectedHeart.removeClass("favorited");
      }
      return;
    }

    // no argument passed, apply function to all hearts on the page
    const heartList = Array.from($(".fa-heart"));
    for (let heart of heartList) {
      if (currentUser.favorites.some(function(story) {
        return story.storyId === heart.parentElement.id;
      })) {
        heart.classList.add("favorited");
      } else {
        heart.classList.remove("favorited");
      }
    }
  }

  // Add trash icons to the stories that are the users own
  function addTrashButtonsToMyStories() {
    const listElements = Array.from($(".story-li"));
    for (let listElement of listElements) {
      if (currentUser.ownStories.some(function(story) {
        return story.storyId === listElement.id;
      })) {
        const trashCan = $(`<span class="trash-btn"><i class="fas fa-trash"></i></span>`);
        trashCan.on("click", handleTrashClick);
        $(listElement).children().last().prev().after(trashCan);
      }
    }
  }

  function addFavoriteButtonsToMyStories() {
    // <i class="fas fa-heart hidden heart"></i>
    const listElements = Array.from($(".story-li"));
    for (let listElement of listElements) {
      const favoriteBtn = $(`<i class="fas fa-heart heart"></i>`);
      favoriteBtn.on("click", handleFavoriteClick);
      $(listElement).prepend(favoriteBtn);
    }
  }

  /* sync current user information to localStorage */

  function syncCurrentUserToLocalStorage() {
    if (currentUser) {
      localStorage.setItem("token", currentUser.loginToken);
      localStorage.setItem("username", currentUser.username);
    }
  }
});
