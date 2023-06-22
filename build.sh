#!/usr/bin/env bash
pushd frontend
pnpm run build
cp dist/* ../server
popd
