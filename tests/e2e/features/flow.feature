Feature: Flow builder workflows
  The flow editor must preserve its editing, validation, history, and routing behavior
  across desktop and mobile browsers.

  Scenario Outline: Edit and persist a message with an uploaded image
    Given I use a "<device>" browser
    And I open the canonical flow
    Then the flow contains 7 nodes
    When I open the "Welcome Message" message node
    Then the details route is "/nodes/b0653a"
    When I change the title to "Welcome Updated"
    And I change the first message to "Updated greeting"
    And I upload the image fixture
    Then the message contains 2 image attachments
    When I save the node and reload the page
    Then the title is "Welcome Updated"
    And the first message is "Updated greeting"
    And the details drawer is visible

    Examples:
      | device  |
      | desktop |
      | mobile  |

  Scenario Outline: Create and validate business hours
    Given I use a "<device>" browser
    And I open the canonical flow
    When I add a node after the trigger
    And I submit the empty node form
    Then the title and description are required
    When I enter the node title "Office Hours" and description "Route by schedule"
    And I choose the "Business Hours" node type
    And I create the node
    Then the flow contains 10 nodes
    And the "Business Hours" editor is visible
    When I choose "09:00 AM" as the first end time
    Then the first business-hours range is invalid
    And saving is disabled
    When I choose "06:00 PM" as the first end time
    And I save the node
    Then saving is disabled

    Examples:
      | device  |
      | desktop |
      | mobile  |

  Scenario Outline: Show inline errors across node editors
    Given I use a "<device>" browser
    And I open the direct route "/nodes/b6a0c1"
    When I clear the title
    Then the "Title" field is invalid
    And the exact error "Title is required" is visible
    When I change the title to "Away Message"
    And I upload an unsupported file
    Then the image upload is invalid
    And the exact error "Use a JPEG, PNG, WebP, or GIF image" is visible
    When I clear the first message
    Then the "Text item 1" field is invalid
    And the exact error "Add at least one message or attachment" is visible
    When I change the first message to "Sorry, we are currently away. We will respond as soon as possible."
    And I open the direct route "/nodes/e879e4"
    And I clear the comment
    Then the "Comment" field is invalid
    And the exact error "Comment is required" is visible

    Examples:
      | device  |
      | desktop |
      | mobile  |

  Scenario Outline: Use history, keyboard activation, deletion, and route guards
    Given I use a "<device>" browser
    And I open the canonical flow
    Then the flow contains 7 nodes
    When I open the "Welcome Message" message node
    And I change the title to "History change"
    And I save the node
    And I close the details drawer
    Then the flow route is restored
    And the "Undo" button is enabled
    When I click the "Undo" button
    Then the "Redo" button is enabled
    When I keyboard-activate the "Away Message" message node
    Then the details route is "/nodes/b6a0c1"
    When I click the "Delete" button
    Then the deletion reconnection warning is visible
    When I confirm deletion
    Then "Away Message" is absent
    And "Add Comment #1" is visible
    When I open the direct route "/nodes/161f52"
    Then the flow route is restored

    Examples:
      | device  |
      | desktop |
      | mobile  |
