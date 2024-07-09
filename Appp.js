import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  PermissionsAndroid,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { BleManager } from 'react-native-ble-plx';
import { AnimatedCircularProgress } from 'react-native-circular-progress';
import { LineChart } from 'react-native-chart-kit';
import io from 'socket.io-client';
import socketServices from './src/utils/socketservice';

const bleManager = new BleManager();

// Function to generate random step count data
const generateRandomSteps = () => {
  return Math.floor(Math.random() * 5000); // Generates a random number between 0 and 5000
};

// Function to generate random graph data
const generateRandomGraphData = () => {
  return Array.from({ length: 7 }, () => Math.floor(Math.random() * 61)); // Generates an array of 7 random numbers between 0 and 60 (inclusive)
};


// Android Bluetooth Permission
async function requestLocationPermission() {
  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
      {
        title: 'Location permission for bluetooth scanning',
        message:
          'Grant location permission to allow the app to scan for Bluetooth devices',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'OK',
      },
    );
    if (granted === PermissionsAndroid.RESULTS.GRANTED) {
      console.log('Location permission for bluetooth scanning granted');
    } else {
      console.log('Location permission for bluetooth scanning denied');
    }
  } catch (err) {
    console.warn(err);
  }
}

requestLocationPermission();

const SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
const STEP_DATA_CHAR_UUID = 'beefcafe-36e1-4688-b7f5-00000000000b';

export default function App() {
  const [deviceID, setDeviceID] = useState(null);
  const [stepCount, setStepCount] = useState(generateRandomSteps());
  const [connectionStatus, setConnectionStatus] = useState('Searching...');
  const [selectedExercise, setSelectedExercise] = useState(1);
  const [showData, setShowData] = useState(false);
  const [sensorData, setSensorData] = useState([]);
  const [selectedGraph, setSelectedGraph] = useState('temperature');
  const [graphData, setGraphData] = useState(generateRandomGraphData());

  const exercises = [
    [
      'Exercise 1:',
      'Step 1: Warm-up and stretching should be done in a proper way',
      'Step 2: The movement of the knee should be made in a rythmic pattern trying to make an angle of 45 degrees',
      'Step 3: The knee should be moved up and down atleast 50 times',
      'Step 4: Proper rest should be taken',
    ],
    [
      'Exercise 2:',
      'Step 1: Stretching and warm up should be done consciously',
      'Step 2: The movement of the knee should be made in a rythmic pattern trying to make an angle of 45 degrees',
      'Step 3: The knee should be moved up and down atleast 75 times',
      'Step 4: After the exercise is done, proper rest should be taken',
    ],
  ];
  

  const progress = (stepCount / 1000) * 100;

  const deviceRef = useRef(null);

  const searchAndConnectToDevice = () => {
    bleManager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        console.error(error);
        setConnectionStatus('Error searching for devices');
        return;
      }
      if (device?.name === 'Step-Sense') {
        bleManager.stopDeviceScan();
        setConnectionStatus('Connecting...');
        connectToDevice(device);
      }
    });
  };

  useEffect(() => {
    searchAndConnectToDevice();
  }, []);

  const connectToDevice = (device) => {
    return device
      .connect()
      .then((device) => {
        setDeviceID(device.id);
        setConnectionStatus('Connected');
        deviceRef.current = device;
        return device.discoverAllServicesAndCharacteristics();
      })
      .then((device) => {
        return device.services();
      })
      .then((services) => {
        let service = services.find((service) => service.uuid === SERVICE_UUID);
        return service.characteristics();
      })
      .then((characteristics) => {
        let stepDataCharacteristic = characteristics.find(
          (char) => char.uuid === STEP_DATA_CHAR_UUID
        );
        stepDataCharacteristic.monitor((error, char) => {
          if (error) {
            console.error(error);
            return;
          }
          console.log('Received step data:', char.value);
          setStepCount(generateRandomSteps());
        });
      })
      .catch((error) => {
        console.log(error);
        setConnectionStatus('Error in Connection');
      });
  };

  useEffect(() => {
    const subscription = bleManager.onDeviceDisconnected(
      deviceID,
      (error, device) => {
        if (error) {
          console.log('Disconnected with error:', error);
        }
        setConnectionStatus('Disconnected');
        console.log('Disconnected device');
        setStepCount(0); // Reset the step count
        if (deviceRef.current) {
          setConnectionStatus('Reconnecting...');
          connectToDevice(deviceRef.current)
            .then(() => setConnectionStatus('Connected'))
            .catch((error) => {
              console.log('Reconnection failed: ', error);
              setConnectionStatus('Reconnection failed');
            });
        }
      }
    );
    return () => subscription.remove();
  }, [deviceID]);

  const handleExerciseChange = (exerciseNumber) => {
    setSelectedExercise(exerciseNumber);
    setShowData(false);
    // Fetch data for the selected exercise and update the graph accordingly
    setGraphData(generateRandomGraphData());
  };

  const handleGraphChange = (graphType) => {
    setSelectedGraph(graphType);
    // Update graph data based on the selected graph type
    switch (graphType) {
      case 'temperature':
        setGraphData(generateRandomGraphData());
        break;
      case 'force':
        setGraphData(generateRandomGraphData());
        break;
      case 'angle':
        setGraphData(generateRandomGraphData());
        break;
      default:
        setGraphData(generateRandomGraphData());
    }
  };

  const exerciseSteps = [
    'Step 1: Warm-up',
    'Step 2: Cardio',
    'Step 3: Strength Training',
    'Step 4: Cool Down',
  ];

  useEffect(() => {
		socketServices.initializeSocket();

		socketServices.on('sensorData', (data) => {
			console.log('Received sensor data from server:', data);
			setSensorData((prevData) => [...prevData, data]);
		});
	}, []);

  const flatListRef = useRef(null);

  useEffect(() => {
    if (flatListRef.current) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  }, [sensorData]);

  const formatSensorData = (data) => {
    const spacedData = data.split(',').map((num) => num.trim()).join(',  ');
    return spacedData;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.contentWrapper}>
        <View style={styles.topTitle}>
          <View style={styles.stepTitleWrapper}>
            {/* <Text style={styles.title}>Step Sense</Text> */}
          </View>
          <View style={styles.exerciseButtons}>
            <TouchableOpacity
              style={[
                styles.exerciseButton,
                selectedExercise === 1 && styles.activeButton,
              ]}
              onPress={() => handleExerciseChange(1)}
            >
              <Text style={styles.exerciseButtonText}>Exercise 1</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.exerciseButton,
                selectedExercise === 2 && styles.activeButton,
              ]}
              onPress={() => handleExerciseChange(2)}
            >
              <Text style={styles.exerciseButtonText}>Exercise 2</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.exerciseButton,
                selectedExercise === 3 && styles.activeButton,
              ]}
              onPress={() => {
                setSelectedExercise(3);
                setShowData(true);
              }}
            >
              <Text style={styles.exerciseButtonText}>Data</Text>
            </TouchableOpacity>
          </View>
        </View>
        {showData && (
          <View style={{ height: 500, width: 300, marginTop: 50 }}>
            <Text>GSR, Angle, Force, Knee Temp(°C)</Text>
            <FlatList
              ref={flatListRef}
              data={sensorData}
              keyExtractor={(item, index) => `${item.time}-${item.voltage}-${index}`}
              renderItem={({item}) => <Text>{formatSensorData(item.voltage)}</Text>}
            />
          </View>
        )}
        {!showData && (
          <>
            <View style={styles.circularProgressWrapper}>
              {/* <AnimatedCircularProgress
                size={280}
                width={15}
                fill={progress}
                lineCap="round"
                tintColor={
                  progress >= 100 ? '#FB975C' : progress >= 50 ? '#EF664C' : '#FFF386'
                }
                backgroundColor="#3d5875"
              >
                {(fill) => (
                  <>
                    <Text style={styles.steps}>{exerciseSteps[selectedExercise - 1]}</Text>
                    <Text style={styles.percent}>{`${Math.round(fill)}%`}</Text>
                  </>
                )}
              </AnimatedCircularProgress> */}
              {exercises[selectedExercise - 1].map((step) => (
                <Text key={step} style={styles.exerciseStep}>{step}</Text>
              ))}
            </View>
            <View style={styles.graphWrapper}>
              <LineChart
                data={{
                  labels: ['1sec', '3sec', '5sec', '7sec', '9sec', '11sec', '13sec'],
                  datasets: [
                    {
                      data: graphData,
                    },
                  ],
                }}
                width={350}
                height={220}
                yAxisSuffix="°"
                chartConfig={{
                  backgroundColor: '#FFF',
                  backgroundGradientFrom: '#FFF',
                  backgroundGradientTo: '#FFF',
                  decimalPlaces: 2,
                  color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                  style: {
                    borderRadius: 16,
                  },
                  propsForDots: {
                    r: '6',
                    strokeWidth: '2',
                    stroke: '#ffa726',
                  },
                }}
              />
            </View>
            <View style={styles.bottomWrapper}>
              <TouchableOpacity
                style={[
                  styles.bottomButton,
                  selectedGraph === 'temperature' && styles.activeBottomButton,
                ]}
                onPress={() => handleGraphChange('temperature')}
              >
                <Text style={styles.bottomButtonText}>Temperature</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.bottomButton,
                  selectedGraph === 'force' && styles.activeBottomButton,
                ]}
                onPress={() => handleGraphChange('force')}
              >
                <Text style={styles.bottomButtonText}>Force</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.bottomButton,
                  selectedGraph === 'angle' && styles.activeBottomButton,
                ]}
                onPress={() => handleGraphChange('angle')}
              >
                <Text style={styles.bottomButtonText}>Angle</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
      <View style={styles.bottomWrapper}>
        <Text style={styles.connectionStatus}>{connectionStatus}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentWrapper: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 20,
    marginTop: 0,
    width: '100%',
  },
  topTitle: {
    paddingVertical: 0,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepTitleWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(251, 151, 92, 0.5)',
    borderRadius: 15,
  },
  title: {
    fontSize: 18,
    paddingVertical: 10,
    paddingHorizontal: 20,
    color: 'white',
  },
  exerciseButtons: {
    flexDirection: 'row',
    marginTop: 10,
  },
  exerciseButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginHorizontal: 5,
    backgroundColor: '#3d5875',
    borderRadius: 10,
  },
  exerciseButtonText: {
    color: 'white',
  },
  activeButton: {
    backgroundColor: '#FB975C',
  },
  circularProgressWrapper: {
    // justifyContent: 'center',
    // alignItems: 'center',
    width: '100%',
    padding: 20,
  },
  exerciseStep: {
    fontSize: 18,
    color: 'black',
  },
  steps: {
    fontSize: 18,
    color: 'white',
    marginTop: 10,
  },
  percent: {
    fontSize: 18,
    color: 'white',
    marginTop: 10,
  },
  graphWrapper: {
    marginTop: 20,
  },
  bottomWrapper: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: 'rgba(251, 151, 92, 0.5)',
    marginBottom: 20,
    height: '10%',
    borderRadius: 20,
    width: '90%',
  },
  bottomButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#3d5875',
    borderRadius: 10,
  },
  bottomButtonText: {
    color: 'white',
  },
  activeBottomButton: {
    backgroundColor: '#FB975C',
  },
  connectionStatus: {
    fontSize: 20,
    color: 'white',
    fontWeight: 'bold',
    fontFamily: 'System',
  },
});
