## ADDED Requirements

### Requirement: Package the verified frontend as an optional container

The container build SHALL use a frozen frontend lockfile and a digest-pinned builder and runtime, and SHALL include only the built site and required static server in the runtime.

#### Scenario: Build the frontend bundle

- **WHEN** an operator builds the image from a clean checkout
- **THEN** the production artifact checks run and the site is placed under the configured base
- **AND** local environment files, source dependencies and test fixtures stay outside the runtime image

### Requirement: Serve root and subpath versions with explicit configuration

The standalone image SHALL serve a verified build at the configured root or subpath using a non-root runtime and clear health and missing-resource behavior.

#### Scenario: Serve a hash deep link

- **WHEN** the browser opens or refreshes a hash route
- **THEN** the configured base document and its assets load
- **AND** missing static files return 404 with health available independently

#### Scenario: Select frontend endpoints

- **WHEN** an operator provides public build arguments
- **THEN** the compiled frontend uses them under its existing browser configuration contract
- **AND** the Docker path remains independent of the hosted production release.
