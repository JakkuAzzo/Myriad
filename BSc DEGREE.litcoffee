BSc DEGREE 
IN 
Computer Science

PROJECT REPORT

Name: Said Osman
ID Number: (k2376552)
Project Title: Myriad – Mindful Habit Tracker

Declarations

I have read and understood the University regulations on academic misconduct, am aware of the internal rules of the CI6600 module, and as such make the following declarations:

•	This report is entirely my own work. Any other sources are duly acknowledged and referenced according to the requirements of the School of Computer Science and Mathematics. 
•	None of the text in this report has been directly copied and pasted from the output of Large Language Models such as ChatGPT, Grok, Gemini, etc. Any other use of an LLM has been acknowledged and attributed by sharing the chat as part of the submission. 
•	All verbatim citations of text that were not written by me – whether they were written by a human or AI – are indicated by double quotation marks (“…”) and the author credited.
•	Any visual artefacts contained in this document were either original compositions by me or the author has been correctly attributed. 
•	I have kept my work secure in accordance with university regulations, and nobody other than myself and academic staff from Kingston University any myself have had access to this work.
•	I have not asked a third party to proof-read my work (except KU academic staff), either in a professional or informal capacity. 
•	To the best of my knowledge, the project in this report has not been previously undertaken either by myself or another student in the previous two academic years.

Date: (28/10/2025)

Signature: ( Said Osman)
 
(PLEASE DELETE ALL THE TEXT BETWEEN THE BRACKETS IN YOUR FINAL SUBMISSION. You can click on the table below and you should see an Update Table button. This will automatically update all headings, subheadings and page numbers. Generally you will want to “Update entire table” if given a choice).
Contents
Chapter 1: Introduction and State of the Art Review	3
Aims and Objectives	4
Chapter 3: Analysis and Design	5
Analysis	5
Design	5
Chapter 4: Realisation	6
Chapter 6: Testing, Validation and Critical Review	6
References	6
Appendices	7

 
Chapter 1: Introduction and State of the Art Review

The vast growth and integration of digital technology into consumer’s everyday life has impacted human behaviour, communication, and overall well-being. Smartphones and social media have been vitally essential tools for connection and productivity. However, there may be complications, such as digital dependency and a reduction in attention spans. Studies show that an estimate of 5-10% of Americans meet the criteria for social media addiction, while UK adults spend an average of 8 hours and 41 minutes daily on screens, interacting with their devices approximately 2,600 times per day. These statistics reflect a growing tension between digital connectivity and mental health. 
The Myriad project is a direct response to this issue, emerging as a privacy-focused data analytic application tailored to help users track and understand their digital habits.  
The system is strict on handling data ethically while fostering Mindfulness and digital well-being. This will be done through a platform like Splunk, Myriad will provide users with meaningful insights into their digital patterns and screen activity without any data being compromised.  

State of Art Review: 
1. Psychology and Digital Well-being
The intersection of technology use with mental health has received considerable attention. In recent years, problematic social media Use according to the World Health Organisation (2024),among European adults has increased from 7% in 2018 to 11% in 2022. Studies consistently associate high levels of social media use with anxiety, depression, and poor sleep quality. The "digital detox" movement has mobilized in response: seven in ten internet users in the UK and US report trying to temper their online behaviour, but without actionable feedback or visibility on usage patterns, these efforts are usually inconsistent or tentative or can't even be measured. 
 
Moreover, digital overload affects interpersonal relationships. According to a 2023 survey, 54% UK adults felt that connected devices interrupted face-to-face conversations frequently.  The findings indicate a need for tools that can visualise the user's own data and allow reflective, self-guided habit changes-precisely what Myriad is trying to achieve.

2. Data Privacy and Ethics

There is an ethical dimension to the collection of personal data. According to a study by KPMG, four out of ten consumers do not believe companies will use their data in an ethical manner, while many feel powerless at controlling how personal information is collected and stored. Indeed, a report by Digital Catapult (2021) found that 80% of users trusted an organisation more after receiving a transparent summary of how their data was used. 
The approach Myriad uses is in line with the "Quantified Self" movement principles that advocate for measuring and analysing aspects of one's life with the help of technology. As opposed to commercial fitness trackers, which beam sensitive information to cloud servers, Myriad keeps all data processing It offers transparency, control, and the erasure of all personal data — all aspects of an increasing market demand for digital privacy. 



3. Technological Advancement and Digital Literacy
Advances in analytics platforms like Splunk have made complex data visualisation accessible to individual users. These tools efficiently manage high volumes of data generated by personal devices. Yet, despite such capabilities, most users lack the digital literacy to interpret their digital footprint meaningfully. A Pew Research 2019 study found that just 3% of Americans understood online privacy laws, even though 92% expressed concern about their privacy. 
 This knowledge gap underlines the necessity of developing user-friendly analytics applications, both visualising and explaining data. Good Things Foundation in 2024 reported that 27% of UK households with children do not have sufficient digital skills in being able to manage online risks. Myriad therefore, will not only offer analytics but will also be an educational tool, allowing the user to improve digital awareness and resilience. 
                                                                                                                                                                

Aims and Objectives

Aim

To design and implement a self-hosted, privacy-preserving data analytics system that enables users to monitor and reflect on their digital communication and browsing habits to promote mindful use of technology.

Objectives
	1.	Develop lightweight, locally hosted data connectors to collect user-selected chat and browser data.
	2.	Implement anonymisation techniques to ensure no personal identifiers are transmitted or stored.
	3.	Configure a local Splunk server for secure ingestion, indexing, and analysis of anonymised data.
	4.	Design a dashboard-based interface to visualise active hours, conversation frequency, topics, and sentiment trends.
	5.	Validate the system through functional, integration, and usability testing while ensuring ethical compliance.
	6.	Critically evaluate the project’s technical limitations, privacy considerations, and potential improvements.
 
Chapter 3: Analysis and Design

Analysis
The Myriad system design was not made by thinking about the analysis and design as two separate things. Instead this chapter shows how what was learned from the users and from the project itself was used to make each decision, about the design of the Myriad system in a way that makes sense and is well organized.
3.1 Analysis
3.1.1 Project Context and Stakeholders
Myriad is a tool that helps people think about how they use technology. It does this in a way that's private and fair. Myriad is different from apps that track what you do. Those apps usually store your information online. Share it with other companies. Myriad does not do this. This is important because Myriad is for people who care about how time they spend on screens and what they do on their devices.. Myriad is also for people who care about what happens to their personal information. Myriad is designed to help people like this think about their technology usage, in a way.
The people who will be using this project are people who want to know more about how they use things. These people use messaging apps and the internet a lot. They probably already know that using these things can affect how well they can focus, how they feel and how much they can get done. The Digital Behaviour project is for these people. They want to understand their behaviour without feeling like someone is watching them. The problem is that they do not have the tools to get this information in a way that's easy to understand and does not feel like someone is spying on them. The project is about behaviour and it is for individual end users who want to know more, about their digital behaviour.
The system is also useful for students and researchers and developers who care about privacy. These people can use the system to see how ethical analytics can be done on their servers. We thought about what these students and researchers and privacy-conscious developers need. This helped us figure out what is important for the project. So we made sure that people have control over their data and that the system is easy to understand and simple, to use. The system is transparent and simple. People own their own data.
3.1.2 Risks, Constraints, and Project Challenges
The project has some problems that we found out early on. When we think about the side of things using Splunk for analytics is complicated, especially for people who are not good with technology. There is also a risk that users of Splunk could feel overwhelmed, by all the data if it is shown in a way that's too complicated or technical. Users of Splunk might have a time understanding the data if it is too detailed.
When you think about it the system is, on your computer but if it does not do a good job of keeping things secret or if it stores things in a way that is not safe then people will not trust it. There is also a problem that people might start checking themselves much and that could make them feel more anxious instead of being more mindful. The system is supposed to help people be more mindful but if people use it much it could have the opposite effect, which is to make them feel anxious and that is not what the mindfulness system is supposed to do the mindfulness system is supposed to help people not make them feel bad and that is why the system needs to be used in a way that is balanced so people can get the most out of the mindfulness system.
The project team thought about these risks the time and they affected the decisions that were made later on. For example the team decided not to show much detail in the dashboards and they made sure that the users had control over the data that was being collected. The goal of the project team was not to get rid of all the risks because that is just not possible but to make sure that the system was designed in a way that clearly tells the users what it is for and what it can and cannot do. The system was designed to be clear, about its purpose and its limitations and the project team worked hard to make sure that the system did what it was supposed to do.
3.1.3 User Engagement and Requirement Gathering
We wanted to find out if the system is what people really need. So we asked some people who might actually use the system what they think about it. We got eight students to give us their thoughts. All eight students use messaging apps and the internet every day. The system is meant for people like these students. They use technology all the time. They know that spending too much time staring at screens is not good for them. They also worry about their privacy when they are online. The students we talked to are a lot, like the people the system is designed for. The system is for people like these students. It is meant to help these students. The system is really, for these students.
We talked to the users in a way to see what they think about their devices. We had chats with them and also gave them a short list of questions to answer.
We wanted to know how time users spend on their devices how users feel about using their devices if users have used apps to track their time before and how much users care about keeping their information private and having control, over their data.
This way users could talk freely. We could still compare what the users said to what other users said.
People use messaging apps. Browse the web a lot every day. We looked at what eight people did. Found out that seven of them use messaging apps and browse the web for at least two hours each day. Some of these people three to be exact use messaging apps and browse the web for four to six hours. The other people, four of them use messaging apps. Browse the web for two to four hours. This shows that messaging apps and web browsing are things that people do every day, as part of their routine. They use messaging apps. Browse the web regularly.
People were asked how technology use affects them. Five people said it affects their focus, mood, productivity or sleep. Two people said it does not affect them. One person was not sure. This shows that many people know that using technology much can be bad for them. It can be bad for their focus, mood, productivity or sleep. This means we need something to help people think about how they use technology. Technology use is a problem, for people.
People talked about using apps that track what they do. Five out of eight people had used apps to see how time they spend on their screens or to track their habits before. The other three had never used these kinds of apps. When we talked to them a lot of people said they did not like apps that made them feel like someone was always watching them. They did not like tracking applications that felt like they were, in control of what they do. People who used tracking applications did not like feeling judged by tracking applications. Tracking applications made people feel uncomfortable when they felt like tracking applications were monitoring them.
People really care about privacy. Most of the people who responded said that storing data on their devices is very important to them. In fact six people thought it was extremely important. People do not like it when apps store their information online without explaining what they are doing with it. A lot of people said they want to be able to keep their data on their devices and delete it whenever they want. This means that people expect to have control, over their data and want to know what is going on with it. People want privacy. They want to be able to make choices about their own data.
People were asked how they want to see information. They liked it when they got pictures, like graphs or trends instead of a lot of words or messages all the time. A lot of people said they want to think about what they're doing by themselves without being told all the time. This is what information should look like. The system is made to show information to people in a way that they like which's simple and quiet. The information is presented in a way like graphs or trends so people can understand it easily.
What people told us was very important for deciding how the system would work and what the right design choices were. These discussions directly influenced decisions such as keeping all data processing local, including a clear option for users to delete their data, and designing dashboards that are simple and non-judgemental. The full questionnaire responses and interview notes are included in the appendix so that the main body of the report remains focused on the key findings. Responses would be found in the appendix.
3.1.4 Requirements Modelling and Prioritisation
The information that people gave us was turned into a list of things that our system needs to do. We wrote down what the system must do in a way that's easy to understand. We used something called user stories to make sure that what people need and what the system does are closely connected. For example people told us that they want all data processing to happen on their devices. This is because people are worried about trust and privacy when it comes to data processing. So we made sure that the system requirements, for data processing say that it must happen locally on the users device, which means that the data processing must happen on the users device.
The team looked at what was needed. Decided what was most important using the MoSCoW method. The things that had to do with privacy and keeping people anonymous and in control were considered necessary because they are crucial to what the project is trying to do.
The team thought that having visuals and a dashboard to look at would be very helpful so they made those a priority too but not as important as the privacy stuff. This is because you need to get the privacy part first before you can make the visuals and dashboard work properly.
Some other things, like analytics were put on the back burner for now they were labelled as things that would be nice to have someday. The project team will look at those again in the future.
The system had to do more than work. It also had to be responsive so users would not get bored waiting for things to happen. If the system is slow users will get frustrated. Stop using it. The system also had to be available all the time. If users cannot use the system when they need to it will not be very useful. These Non-functional requirements were figured out by looking at the project not just by using a standard set of rules. The Non-functional requirements were important for the system to be helpful, to users.

Design

3.2.1 Design Approach and Rationale
The Myriad design was made because of what was learned from looking at the information. Every choice that was made about the design of Myriad can be linked to something that the users were worried about or something that was important to consider from a point of view or a technical issue that had to be dealt with. The design of Myriad is simple and easy to understand it is clear what is going on. It does not have a lot of extra features that are not needed. The Myriad design is about being clear and simple not, about having a lot of features.
The project does not try to use a lot of design techniques just to show them off. It uses a simple models that make sense to clearly show how the system works and how users will use it. The project uses these models to explain how the system will function and how users will interact with the system.
3.2.2 System Architecture Design
The system is set up in a way to keep things separate and safe. It has layers. At the bottom there are local data agents. These agents collect information that the user says is okay to collect. This information is from chats and browsing. The user has to say it is okay first. This way the system does not collect any information without the user knowing about it. The system collects user-approved chat. Browsing data to make sure the user is, in control.
When we get this data it goes through a layer that makes it private right away. This layer. Hides any information that can be used to identify people. We do this before we even look at the data. We made this decision because people are worried about being watched and about their data being used in the way. This is what the anonymisation layer is, for it is the anonymisation layer that helps us with this problem the anonymisation layer is very important.
The anonymous information is then sent to a computer system in our office that uses Splunk to organise and examine it.
Finally the part of the system that people interact with shows graphs and charts that help us see what people are doing so we can think about it. Learn from it rather than watching it all the time.
3.2.3 Interface and Interaction Design
We used drawings to see how people would use the system and find their way, around it. The system looks very basic on purpose it uses things like timelines and trend graphs that people are used to seeing. This makes it easier for people to understand the system without having to think much. It helps people see patterns in the behaviour of the system quickly.
The data control panel is an important part of the design. It lets users do things like stop tracking get rid of data or change their privacy settings. This is a deal because the project is all, about giving users control and doing things in a way that is fair. The way the interface looks and the words it uses are meant to be calm and not try to tell users what to do. The idea is to help users be more mindful not to make them feel like they have to do something.
3.2.4 Design Outcome and Forward Path
The design in this chapter gives us a starting point for building something. It has all the parts, like how the system works and what it needs to do so a developer can make a basic version of the system. The design is also simple enough that we can make changes later like adding information or using different tools to look at the data. The system design is pretty flexible which means we can add data sources or use different analytics tools if we want to.
Overall, this chapter demonstrates how Myriad’s design emerged logically from analysis, user engagement, and ethical considerations, resulting in a system that is both technically feasible and contextually appropriate.

 
Chapter 4: Realisation

Chapter 6: Testing, Validation and Critical Review


Appendices

Digital Catapult (2021). Personal Data Receipts: Increasing Transparency and Trust. [online] Available at: https://www.digicatapult.org.uk/wp-content/uploads/2021/11/Personal_Data_Receipts_r1.5_2.pdf

Good Things Foundation (2024). Digital Inclusion Datasets. [online] Available at: https://www.goodthingsfoundation.org

KPMG (2022). Corporate Data Ethics and Consumer Trust. [online]

Pew Research Center (2019). Americans and Privacy: Concerned, Confused and Feeling Lack of Control.

World Health Organization (2024). Teens, Screens, and Mental Health. [online] Available at: https://www.who.int/europe/news/item/25-09-2024-teens–screens-and-mental-health

Questionnaire responses:
https://docs.google.com/spreadsheets/d/1OGtXWgSG-dZ9GTpFj3Rbe610ZDnywSYThxinYbUCAeA/edit?usp=sharing

chat gpt link:
https://chatgpt.com/share/6942d317-a8e4-8010-9ac5-44c48456eb64





