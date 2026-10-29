# Kotori — DevOps UTS Project

**Kotori** is a Japanese EPUB reader application designed to provide an immersive reading experience with an integrated dictionary, Japanese text analysis, text-to-speech, and offline reading capabilities.

This repository contains a copy of the original Kotori project, adapted as a collaborative project for the **DevOps Midterm Examination (UTS)**. The project focuses on implementing and evaluating DevOps practices, including Continuous Integration (CI), automated testing, code quality analysis, and DevSecOps.

> **Academic Project Notice**
>
> This repository is maintained for educational purposes as part of a university group assignment. It is based on the original Kotori project and is maintained separately from the original repository. DevOps configurations, code changes, tests, and documentation developed for this assignment will be maintained here.

## Original Project

- **Original Repository:** [kaisaaru/kotori](https://github.com/kaisaaru/kotori)
- **Project Repository:** [RukoPermata/kotori-devops](https://github.com/RukoPermata/kotori-devops)
- **Original Application:** [kotori.kaisaaru.dev](https://kotori.kaisaaru.dev)

This repository starts from the original Kotori codebase. Existing application features are inherited from that codebase, while subsequent changes will be developed and documented as part of the DevOps assignment.

## Project Objectives

The objectives of this project are to:

1. Implement a Continuous Integration pipeline using GitHub Actions.
2. Introduce and maintain automated tests for application changes.
3. Analyze code quality using SonarQube.
4. Apply DevSecOps practices, including STRIDE threat modeling, dependency auditing, and secret management.
5. Enforce collaborative development practices through pull requests, code reviews, and branch protection.
6. Document individual contributions, implementation results, and lessons learned.

## Application Features

The repository inherits the following features from the original Kotori application:

### 1. Japanese EPUB Reader
- Vertical and horizontal Japanese text layouts.
- Customizable typography, font size, spacing, and reading themes.
- Chapter navigation and reading progress management.

### 2. Integrated Japanese Dictionary
- Yomitan-style dictionary pop-ups.
- Japanese word lookup and conjugation de-inflection.
- Dictionary data from multiple Japanese-language resources.
- Kanji and vocabulary information.

### 3. Text-to-Speech
- Japanese speech synthesis using available browser voices.
- Audio playback support for reading Japanese text.

### 4. Offline Reading and PWA
- Local book storage using IndexedDB.
- Offline dictionary functionality.
- Progressive Web App installation support.
- Network connectivity status notifications.

### 5. Library Backup and Restore
- Export and import of `.kotori` library archives.
- Backup and restoration of books, settings, and reading progress.
- Validation and sanitization during restoration.

These features describe the inherited application. Additional features and modifications made for the DevOps assignment will be documented separately as they are implemented.

## Technology Stack

| Technology | Purpose |
|---|---|
| Next.js 16 | Web application framework |
| React 19 | User interface |
| TypeScript | Application development |
| Tailwind CSS v4 | Styling |
| Zustand | Client-side state management |
| IndexedDB | Local book and reading data storage |
| SQLite | Dictionary indexing and lookup |
| Git and GitHub | Version control and collaboration |
| GitHub Actions | Continuous Integration |
| Node.js Test Runner | Automated testing |
| SonarQube | Code quality analysis |

## DevOps Implementation

The group will evaluate and develop the following practices according to the UTS requirements.

### Continuous Integration
GitHub Actions will be used to automate relevant validation steps when code is pushed or a pull request is opened.

The existing workflow includes TypeScript type checking, ESLint, application builds, and automated tests. The workflow will be evaluated and extended as necessary.

### Automated Testing
Automated tests will be added or improved to validate application behavior, individual changes, and relevant edge cases.

### Code Quality Analysis
SonarQube will be used to analyze code quality, including bugs, code smells, and vulnerabilities. Findings and corrective actions will be documented.

### DevSecOps
The project will address the following requirements:

- **STRIDE threat modeling:** Identify application-specific threats, assess risks, and document mitigations.
- **Dependency auditing:** Integrate `npm audit` into the CI pipeline and review the results.
- **Secret management:** Avoid hardcoded credentials and use GitHub Secrets when sensitive configuration is required.
- **Branch protection and code review:** Require pull requests and at least one reviewer before merging into the protected main branch.

Implementation status and supporting evidence will be documented as the work progresses.

## Development Setup

### Prerequisites

- Node.js 22 or newer.
- npm.
- Git.

### Installation

Clone the assignment repository:

```bash
git clone https://github.com/RukoPermata/kotori-devops.git
cd kotori-devops
```

Install dependencies:

```bash
npm ci
```

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Available Validation Commands

Run automated tests:

```bash
npm test
```

Run TypeScript type checking:

```bash
npx tsc --noEmit
```

Run ESLint:

```bash
npm run lint
```

Build the application:

```bash
npm run build
```

The production build includes the repository's dictionary-cache preparation script. Refer to the project configuration if additional setup is required.

## Contribution Guidelines

All group members are expected to contribute to application changes and provide evidence of their work.

1. Create a separate branch for each task.
2. Implement the assigned change and relevant tests.
3. Run the applicable validation commands.
4. Open a pull request against `main`.
5. Request at least one review before merging.
6. Document the change, test results, and individual contribution.

Each member must make at least three application changes in accordance with the UTS requirements. Changes must be meaningful and demonstrable; commit count alone does not establish that the requirement has been met.

## Project Documentation

The project report and demonstration will cover:

- Application description and technology stack.
- CI workflow and configuration.
- Application changes and individual contributions.
- Automated testing and test results.
- SonarQube findings and improvements.
- STRIDE threat modeling and other DevSecOps practices.
- Team retrospective, lessons learned, and future improvements.

## Credits and Acknowledgments

This assignment repository is derived from the original Kotori project by Kaisaaru.

The original project's acknowledgments, third-party attributions, dictionary data notices, and applicable license information are retained in the repository. See the original [Kotori repository](https://github.com/kaisaaru/kotori) for project history and additional context.

## License

The original Kotori project includes an MIT License. Refer to the [`LICENSE`](LICENSE) file in this repository and the applicable third-party licenses for the terms governing use, modification, and redistribution.
