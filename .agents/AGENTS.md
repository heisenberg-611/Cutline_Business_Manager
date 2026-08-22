# Workspace Agent Rules

### Git Workflows
- **Always use true merge commits:** When running `git merge` commands, you must always include the `--no-ff` flag to ensure a true merge commit is created. Never perform a fast-forward merge.
- **Feature Branches and Pull Requests:** When asked to make a feature, create and checkout a new branch for the feature. After the work is done and you are asked to make a pull request, push the branch and open a pull request on the repository.

### Database Workflows
- **Test Database:** Whenever a test database needs to be created, always use Docker to spin up the instance rather than modifying a production or remote database.
