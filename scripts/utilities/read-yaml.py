#!/usr/bin/env python3
import yaml
import sys

if len(sys.argv) != 4:
    sys.exit(1)

config_file = sys.argv[1]
env = sys.argv[2]
key = sys.argv[3]

with open(config_file, 'r') as f:
    config = yaml.safe_load(f)
    env_config = config.get(env, {})
    print(env_config.get(key, ''))
