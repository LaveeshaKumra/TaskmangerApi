const express = require('express');
const fs = require('fs');
const bodyParser = require('body-parser');
const { body, validationResult } = require('express-validator');

const app = express();
const port = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.listen(port, (err) => {
    if (err) {
        return console.log('Something bad happened', err);
    }
    console.log(`Server is listening on ${port}`);
});


app.use(bodyParser.json());

// Helper function to read tasks from JSON file
function readTasksFromFile(callback) {
    fs.readFile('task.json', 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            callback(err, null);
            return;
        }

        try {
            const tasks = JSON.parse(data);
            callback(null, tasks.tasks); // Passes just the 'tasks' array to callback
        } catch (error) {
            console.error(error);
            callback(error, null);
        }
    });
}


// Helper function to write tasks to JSON file
function writeTasksToFile(tasks, callback) {
    fs.writeFile('task.json', JSON.stringify({ tasks }, null, 2), (err) => {
        if (err) {
            console.error(err);
            callback(err);
            return;
        }
        callback(null);
    });
}

// Helper validator to validate task objects
const validPriorityValues = ['high', 'medium', 'low'];
const validateTask = [
    //title should not be empty and should be a string value
    body('title').notEmpty().withMessage('Title is required').isString(),
    //title should not be empty and should be a string value
    body('description').notEmpty().withMessage('Description is required').isString(),
    //title should be a boolean value
    body('completed').optional().isBoolean().withMessage('Completed must be a boolean'),
    //title should be be among high, medium, low 
    body('priority').optional().isString().isIn(validPriorityValues).withMessage('Priority must be among high, medium, low. Default value is medium'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    }
];

//Get all tasks from task.json file
app.get('/tasks', (req, res) => {
    readTasksFromFile((err, tasks) => {
        if (err) {
            res.status(500).send('Error reading tasks file');
            return;
        }
        res.json(tasks);
    });
});

app.get('/tasks/:id', function(req, res) {
    // Extract the ID parameter and convert to integer
    const taskId = parseInt(req.params.id); 

    readTasksFromFile((err, tasks) => {
        if (err) {
            res.status(500).send('Error reading tasks file');
            return;
        }

        // Find the task with the specified ID
        const task = tasks.tasks.find(task => task.id === taskId); // Accessing 'tasks' array from the JSON

        //If task is undefined  
        if (!task) {
            res.status(404).send('Task not found');
        } else {
            res.json(task);
        }
    });
  });

  app.post('/tasks',validateTask, (req, res) => {
    if (!isValidJson(req.body)) {
        return res.status(400).json({ error: 'Invalid JSON data' });
    }
    readTasksFromFile((err, tasks) => {
        if (err) {
            res.status(500).send('Error reading tasks file');
            return;
        }
        //checking the last id in json file , incrementing that for next id 
        const newTaskId = tasks.length > 0 ? tasks[tasks.length - 1].id + 1 : 1;
        const newTask = {
            id: newTaskId,
            title: req.body.title,
            description: req.body.description,
            completed: req.body.completed || false, //if status is not maked , default value will be false
            priority: req.body.priority || "medium" //if priority is not maked , default value will be medium
        };
        //adding new task to exiting json
        tasks.push(newTask);
        //write task.json file with updated json object 
        writeTasksToFile(tasks, (err) => {
            if (err) {
                res.status(500).send('Error writing tasks file');
                return;
            }

            res.status(201).json(newTask);
        });
        
    });
});

// Function to check if input is valid JSON
function isValidJson(data) {
    try {
        JSON.parse(JSON.stringify(data));
        return true;
    } catch (error) {
        return false;
    }
}

// Endpoint to update a task by ID
app.put('/task/:id',validateTask, (req, res) => {
    if (!isValidJson(req.body)) {
        return res.status(400).json({ error: 'Invalid JSON data' });
    }
    const taskId = parseInt(req.params.id);
    const updatedTask = req.body;

    readTasksFromFile((err, tasks) => {
        if (err) {
            res.status(500).send('Error reading tasks file');
            return;
        }

        // Find index of task with given ID
        const taskIndex = tasks.findIndex(task => task.id === taskId);

        if (taskIndex === -1) {
            res.status(404).send('Task not found');
            return;
        }

        // Update task data
        tasks[taskIndex] = {
            id: taskId,
            title: updatedTask.title || tasks[taskIndex].title,
            description: updatedTask.description || tasks[taskIndex].description,
            completed:  updatedTask.completed || tasks[taskIndex].completed,
            priority: updatedTask.priority || tasks[taskIndex].priority,
        };
        // Write updated tasks array back to the JSON file
        writeTasksToFile(tasks, (err) => {
            if (err) {
                res.status(500).send('Error writing tasks file');
                return;
            }

            res.status(200).json(tasks[taskIndex]);
        });
    });
});

// Endpoint to delete a task by ID
app.delete('/task/:id', (req, res) => {
    const taskId = parseInt(req.params.id);

    readTasksFromFile((err, tasks) => {
        if (err) {
            res.status(500).send('Error reading tasks file');
            return;
        }

        // Find index of task with given ID
        const taskIndex = tasks.findIndex(task => task.id === taskId);

        if (taskIndex === -1) {
            res.status(404).send('Task not found');
            return;
        }

        // Remove task from tasks array
        tasks.splice(taskIndex, 1);

        // Write updated tasks array back to the JSON file
        writeTasksToFile(tasks, (err) => {
            if (err) {
                res.status(500).send('Error writing tasks file');
                return;
            }

            res.status(200).send('Task deleted successfully');
        });
    });
});


// Endpoint to fetch all task by priority
app.get('/tasks/priority/:level', (req, res) => {
    const level = req.params.level;
    if (level!="high" || level!="medium" || level!="low"){
        res.status(500).send('Parameter Value should be in high/medium/low');
        return;
    }
    readTasksFromFile((err, tasks) => {
        if (err) {
            res.status(500).send('Error reading tasks file');
            return;
        }
        const highPriorityTasks = tasks.filter(task => task.priority === level);
        if (!highPriorityTasks) {
            res.status(404).send(`No Task found with ${level}`);
        } else {
            res.json(highPriorityTasks);
        }
    });
});


// Endpoint to fetch all task on based of completion status
app.get('/tasks/completion/:status', (req, res) => {
    const status = req.params.status;
    if (status!=true || status!=false){
        res.status(500).send('Parameter Value should either true/false');
        return;
    }
    readTasksFromFile((err, tasks) => {
        if (err) {
            res.status(500).send('Error reading tasks file');
            return;
        }
        const highPriorityTasks = tasks.filter(task => task.completed === status);
        const value=status==true?"Done":"Pending";
        if (highPriorityTasks.length==0) {
            res.status(404).send(`No Task found with completion status as ${value}`);
        } else {
            res.json(highPriorityTasks);
        }
    });
});




// Endpoint for any invalid api request
app.use('/*', (req, res) => {
    res.status(404).send("Invalid api request")
});

module.exports = app;