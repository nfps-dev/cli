# @nfps.dev/cli

CLI tool for managing an NFP project by querying and executing its contract on chain.


## Install

```sh
npm i -g @nfps.dev/cli
```

```sh
yarn global add @nfps.dev/cli
```


## Usage

```sh
nfp --help
```

Any command that has a machine-readable output (e.g., from querying or executing the contract) will write only that output to `stdout`, whereas everything else gets written to `stderr` for a better UX from CLI.

This means you can safely pipe stdout to another command or redirect it to a file.

For example:
```sh
nfp minters list > minters.json
```
