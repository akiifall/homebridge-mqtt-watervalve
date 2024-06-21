- Water Valve Accessory with Local MQTT Server

- add new property
  - deviceType 
    - 0 : ”Generic valve”
    - 1 : ”Irrigation”
    - 2 : ”Shower head”
    - 3 : ”Water faucet”
    - 4-255 : ”Reserved”
 
 - topicStatus message format : {"DeviceStatus":"ON"} (or OFF)

- Version History
  - v. 1.0.8
    - Patch CVE-2024-37890 : ws affected by a DoS

  - v. 1.0.7
    - Patch CVE-2021-44906 : Prototype Pollution in minimist

