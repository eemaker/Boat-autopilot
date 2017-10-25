#pragma once
#include "Coordinate.h"
#include <vector>

class NavigationData
{
public:
	NavigationData(std::vector<Coordinate> completed_path, 
		std::vector<Coordinate> polyline, int ete, double progress);
	~NavigationData();

public:
	std::vector<Coordinate> Completed_path_;
	std::vector<Coordinate> Polyline_; //Consider if vector is the best list for this
	int Ete_;
	double Progress_;
};

